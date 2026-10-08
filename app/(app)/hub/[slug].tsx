import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useKeepAwake } from "expo-keep-awake";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { GameBuyOffer, GameLastRoll, GamePlayer } from "@/api/types";
import { Joystick } from "@/components/board/Joystick";
import { PlayerInfoModal } from "@/components/board/PlayerInfoModal";
import { stripWorldNamePrefix } from "@/components/board/deedVisual";
import { shortTileName } from "@/components/board/tileLabel";
import { tileVisual } from "@/components/board/tileStyle";
import { HubBuySheet } from "@/components/hub/HubBuySheet";
import { HubChatRail } from "@/components/hub/HubChatRail";
import { HubLocationCopy } from "@/components/hub/HubLocationCopy";
import { HubMediaRail } from "@/components/hub/HubMediaRail";
import { HubRoster, type HubRosterRow } from "@/components/hub/HubRoster";
import { HubScene } from "@/components/hub/HubScene";
import { HubTurnSheet } from "@/components/hub/HubTurnSheet";
import { useMe } from "@/hooks/useAuth";
import { useBlockHardwareBack } from "@/hooks/useBlockHardwareBack";
import { useHubPresence } from "@/hooks/useBoardPresence";
import {
  useBuyProperty,
  useEndTurn,
  useGame,
  useLeaveHub,
  useRollDice,
} from "@/hooks/useGame";
import { useDiceRollMotion } from "@/hooks/useDiceRollMotion";
import { useEconomyFeedback } from "@/hooks/useEconomyFeedback";
import { useHubTurnBusy } from "@/hooks/useHubTurnBusy";
import { useHubWalk } from "@/hooks/useHubWalk";
import { usePresencePoseSend } from "@/hooks/usePresencePoseSend";
import {
  DEFAULT_WORLD_ID,
  useLocationBySlug,
  useLocations,
} from "@/hooks/useLocations";
import { useSession } from "@/hooks/useSession";
import { useCurrentTurnClock } from "@/hooks/useTurnCountdown";
import { buildDiceRollToast } from "@/lib/economyFeedback";
import { formatUsername } from "@/lib/formatUsername";
import { abortHubEnter } from "@/lib/hubEnterGuard";
import { buildHubRemoteMetas } from "@/lib/buildHubRemoteMetas";
import { accentAgainstFloor } from "@/lib/hubFloorContrast";
import { notify } from "@/lib/notify";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

const JOYSTICK_SIZE = 96;
/** Match board `BoardPanel` dock offset. */
const DOCK_PAD = 36;
const PANE_FLEX = 1;
const CENTER_EDGE = 2;

/**
 * Phase 9 hub chrome: 3-pane + floor copy + roster (9.0d).
 * Keep-awake — board may not cover this route.
 */
export default function HubScreen() {
  useBlockHardwareBack(true);
  useKeepAwake("meetopoly-hub", { suppressDeactivateWarnings: true });
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    slug?: string;
    worldId?: string;
    gameId?: string;
  }>();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const worldId =
    typeof params.worldId === "string" && params.worldId.length > 0
      ? params.worldId
      : DEFAULT_WORLD_ID;
  const gameId =
    typeof params.gameId === "string" && params.gameId.trim().length > 0
      ? params.gameId.trim()
      : null;

  const { token, user } = useSession();
  const me = useMe(Boolean(token));
  const username = me.data?.username ?? user?.username ?? null;
  const sessionUserId = me.data?.id ?? user?.id ?? null;

  const {
    data: location,
    isLoading,
    isError,
    error,
  } = useLocationBySlug(worldId, slug);
  const worldLocations = useLocations(worldId);
  const boardLocations = worldLocations.data?.locations ?? [];

  const hubId = location?.hubId?.trim() || null;
  const presence = useHubPresence(hubId);
  const leaveHubMut = useLeaveHub(gameId);
  const leaveHubRef = useRef(leaveHubMut.mutate);
  leaveHubRef.current = leaveHubMut.mutate;
  const gameQuery = useGame(gameId);
  const game = gameQuery.data ?? null;
  const rollDice = useRollDice(gameId);
  const endTurnMut = useEndTurn(gameId);
  const buyMut = useBuyProperty(gameId);
  const turnClock = useCurrentTurnClock(game);

  const localUserId = useMemo(() => {
    if (sessionUserId) {
      return sessionUserId;
    }
    if (!game || !username) {
      return null;
    }
    const key = formatUsername(username).toLowerCase();
    return (
      game.players.find((p) => formatUsername(p.username).toLowerCase() === key)
        ?.userId ?? null
    );
  }, [sessionUserId, game, username]);

  const localPlayer = useMemo(
    () => game?.players.find((p) => p.userId === localUserId) ?? null,
    [game?.players, localUserId],
  );

  const [surfaceBox, setSurfaceBox] = useState({ w: 0, h: 0 });
  const [turnSheetOpen, setTurnSheetOpen] = useState(false);
  const [buySheetOpen, setBuySheetOpen] = useState(false);
  const [buySheetOffer, setBuySheetOffer] = useState<GameBuyOffer | null>(null);
  const [awaitingEndAfterBuy, setAwaitingEndAfterBuy] = useState(false);
  const [infoPlayer, setInfoPlayer] = useState<GamePlayer | null>(null);
  const buyOfferKeyRef = useRef<string | null>(null);
  const surfaceW = Math.max(0, Math.floor(surfaceBox.w));
  const surfaceH = Math.max(0, Math.floor(surfaceBox.h));
  const surfaceReady = surfaceW > 0 && surfaceH > 0;
  /** Dice/economy toasts only while hub focused (board stack owns toasts otherwise). */
  const [hubFocused, setHubFocused] = useState(true);
  const onSpectatorDiceRoll = useCallback(
    (roll: GameLastRoll) => {
      if (!hubFocused) {
        return;
      }
      const { title, message } = buildDiceRollToast({
        roll,
        localUserId,
        players: game?.players,
      });
      notify({
        type: "info",
        title,
        message,
        visibilityTime: 3200,
      });
    },
    [game?.players, hubFocused, localUserId],
  );
  const { holdPinWalk } = useDiceRollMotion(game, {
    localUserId,
    onSpectatorRoll: onSpectatorDiceRoll,
  });
  const turnBusy = useHubTurnBusy(game, holdPinWalk, localUserId);

  // Phase 9.3 — board economy events as hub toasts only.
  useEconomyFeedback({
    game,
    locations: boardLocations,
    localUserId,
    waitIdle: turnBusy,
    surface: "hub",
    enabled: hubFocused,
  });

  const walk = useHubWalk({
    width: surfaceW,
    height: surfaceH,
    username,
    enabled: surfaceReady,
  });

  /** When true, blur must not call leave-hub (Open board keeps hubId). */
  const skipLeaveOnBlurRef = useRef(false);
  const turnEdgeRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setHubFocused(true);
      return () => {
        setHubFocused(false);
        if (skipLeaveOnBlurRef.current) {
          skipLeaveOnBlurRef.current = false;
          return;
        }
        if (gameId) {
          abortHubEnter();
          leaveHubRef.current(undefined, {
            onError: (err) => {
              console.warn("[hub] leave-hub failed", err);
            },
          });
        }
      };
    }, [gameId]),
  );

  const isMyTurn = Boolean(
    game &&
    localUserId &&
    game.status === "active" &&
    game.currentUserId === localUserId &&
    localPlayer &&
    !localPlayer.resigned,
  );
  const inHubMarked = Boolean(localPlayer?.hubId?.trim());

  useEffect(() => {
    if (!isMyTurn || !inHubMarked || !game) {
      return;
    }
    const edge = `${game.currentUserId}:${game.turnStartedAt ?? ""}`;
    if (turnEdgeRef.current === edge) {
      return;
    }
    turnEdgeRef.current = edge;
    setTurnSheetOpen(true);
    notify({
      type: "info",
      title: "Your turn",
      message: "Open the board to play",
      visibilityTime: 3200,
    });
  }, [isMyTurn, inHubMarked, game]);

  const getPoseRef = useRef(walk.getPose);
  getPoseRef.current = walk.getPose;
  const isWalkingRef = useRef(walk.isWalking);
  isWalkingRef.current = walk.isWalking;
  const sendPoseRef = useRef(presence.sendPose);
  sendPoseRef.current = presence.sendPose;
  const surfaceWRef = useRef(surfaceW);
  surfaceWRef.current = surfaceW;
  const surfaceHRef = useRef(surfaceH);
  surfaceHRef.current = surfaceH;
  // Hub: idle rate while turn cinema (dice hold + pin mirror) is busy.
  const hubPosePreferIdleRef = useRef<() => boolean>(() => false);
  hubPosePreferIdleRef.current = () => turnBusy;

  usePresencePoseSend({
    enabled: Boolean(presence.dcOpen && surfaceReady),
    getNormPose: () => {
      const w = surfaceWRef.current;
      const h = surfaceHRef.current;
      const pose = getPoseRef.current();
      if (w <= 0 || h <= 0) {
        return { x: 0, y: 0 };
      }
      return { x: pose.x / w, y: pose.y / h };
    },
    sendPose: (p) => sendPoseRef.current(p),
    isWalking: () => isWalkingRef.current(),
    preferIdle: () => hubPosePreferIdleRef.current(),
  });

  const code = location ? shortTileName(location) : "";
  const hubDisplayName = location
    ? stripWorldNamePrefix(location.name)
    : isLoading
      ? "…"
      : slug || "Hub";
  const tile = tileVisual(location ?? undefined);
  const floorColor = tile.bandColor ?? tile.fill;
  const hubBlurb =
    location?.about?.trim() ||
    location?.aboutShort?.trim() ||
    location?.description?.trim() ||
    "";
  /** Symmetric inset so centered stack stays clear of the notch. */
  const copyPadV = 12 + insets.top;
  /** Icon (~52) + gaps + title/code (~56); keep about inside remaining pane height. */
  const blurbLines = Math.max(
    2,
    Math.floor(
      (Math.max(0, surfaceBox.h) - copyPadV * 2 - 52 - 10 - 56) / 18,
    ),
  );

  const registryRemotes = useMemo(
    () =>
      buildHubRemoteMetas({
        remotePeerIds: presence.remotePeerIds,
        roster: presence.roster,
        players: game?.players ?? [],
        localUserId,
        floorColor,
        fallbackAccent: colors.muted,
      }),
    [
      presence.remotePeerIds,
      presence.roster,
      game?.players,
      floorColor,
      localUserId,
    ],
  );

  const localAccent = useMemo(() => {
    const preferred = localPlayer?.pinColor?.trim() || walk.accent;
    return accentAgainstFloor(
      preferred,
      floorColor,
      localUserId ?? username ?? "local",
    );
  }, [localPlayer?.pinColor, walk.accent, floorColor, localUserId, username]);

  const rosterRows = useMemo((): HubRosterRow[] => {
    const pinByUser = new Map<string, string>();
    const countryByUser = new Map<string, string>();
    const avatarByUser = new Map<string, string>();
    for (const p of game?.players ?? []) {
      if (p.pinColor) {
        pinByUser.set(p.userId, p.pinColor);
      }
      if (typeof p.country === "string" && p.country.trim()) {
        countryByUser.set(p.userId, p.country.trim().toUpperCase());
      }
      const url = typeof p.avatarUrl === "string" ? p.avatarUrl.trim() : "";
      if (url) {
        avatarByUser.set(p.userId, url);
      }
    }
    for (const entry of presence.roster) {
      const url =
        typeof entry.avatarUrl === "string" ? entry.avatarUrl.trim() : "";
      if (url) {
        avatarByUser.set(entry.userId, url);
      }
    }
    const localCountry =
      (typeof localPlayer?.country === "string" &&
        localPlayer.country.trim().toUpperCase()) ||
      (typeof me.data?.country === "string" &&
        me.data.country.trim().toUpperCase()) ||
      "";
    const localAvatar =
      (typeof me.data?.avatarUrl === "string" && me.data.avatarUrl.trim()) ||
      (typeof localPlayer?.avatarUrl === "string" &&
        localPlayer.avatarUrl.trim()) ||
      "";

    const byId = new Map<string, HubRosterRow>();
    for (const entry of presence.roster) {
      if (!entry.userId) {
        continue;
      }
      const preferred = pinByUser.get(entry.userId) ?? colors.muted;
      const country =
        (typeof entry.country === "string" && entry.country.trim()
          ? entry.country.trim().toUpperCase()
          : "") ||
        countryByUser.get(entry.userId) ||
        undefined;
      byId.set(entry.userId, {
        userId: entry.userId,
        username: entry.username,
        country,
        accent: accentAgainstFloor(preferred, floorColor, entry.userId),
        isLocal: Boolean(localUserId && entry.userId === localUserId),
        avatarUrl: avatarByUser.get(entry.userId),
      });
    }

    if (localUserId) {
      const existing = byId.get(localUserId);
      byId.set(localUserId, {
        userId: localUserId,
        username: existing?.username || username || "Player",
        country: existing?.country || localCountry || undefined,
        accent: localAccent,
        isLocal: true,
        avatarUrl: localAvatar || existing?.avatarUrl,
      });
    }

    return Array.from(byId.values()).sort((a, b) => {
      if (a.isLocal && !b.isLocal) {
        return -1;
      }
      if (!a.isLocal && b.isLocal) {
        return 1;
      }
      return formatUsername(a.username).localeCompare(
        formatUsername(b.username),
      );
    });
  }, [
    presence.roster,
    game?.players,
    localUserId,
    localPlayer?.country,
    localPlayer?.avatarUrl,
    me.data?.country,
    me.data?.avatarUrl,
    username,
    localAccent,
    floorColor,
  ]);

  /** Chat bubble fills — same accents as hub avatars / roster dots. */
  const chatAccentByUserId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of rosterRows) {
      map[row.userId] = row.accent;
    }
    for (const remote of registryRemotes) {
      if (!map[remote.userId]) {
        map[remote.userId] = remote.accent;
      }
    }
    if (localUserId) {
      map[localUserId] = localAccent;
    }
    return map;
  }, [rosterRows, registryRemotes, localUserId, localAccent]);

  /** Profile photos for hub chat bubbles (Phase 19.1). */
  const chatAvatarByUserId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of rosterRows) {
      const url =
        typeof row.avatarUrl === "string" ? row.avatarUrl.trim() : "";
      if (url) {
        map[row.userId] = url;
      }
    }
    for (const remote of registryRemotes) {
      const url =
        typeof remote.imageUrl === "string" ? remote.imageUrl.trim() : "";
      if (url && !map[remote.userId]) {
        map[remote.userId] = url;
      }
    }
    return map;
  }, [rosterRows, registryRemotes]);

  const bankLabel =
    localUserId && turnClock?.userId === localUserId ? turnClock.label : "";
  const canRoll = Boolean(isMyTurn && game?.canRoll);
  const canEnd = Boolean(isMyTurn && game?.canEndTurn);
  const buyOffer = game?.buyOffer ?? null;
  const canBuyOffer = Boolean(
    buyOffer && isMyTurn && inHubMarked && game?.canBuy && !turnBusy,
  );
  const localCash = localPlayer?.cash ?? 0;
  const canAffordBuy = Boolean(
    buySheetOffer && localCash >= buySheetOffer.price,
  );
  const showBuySheet = Boolean(
    buySheetOpen &&
    isMyTurn &&
    inHubMarked &&
    !turnBusy &&
    buySheetOffer &&
    (canBuyOffer || awaitingEndAfterBuy),
  );

  useEffect(() => {
    if (!isMyTurn) {
      setAwaitingEndAfterBuy(false);
      setBuySheetOffer(null);
      setBuySheetOpen(false);
      buyOfferKeyRef.current = null;
    }
  }, [isMyTurn]);

  useEffect(() => {
    if (!canBuyOffer || !buyOffer) {
      if (!buyOffer && !awaitingEndAfterBuy) {
        buyOfferKeyRef.current = null;
      }
      return;
    }
    const key = `${buyOffer.boardIndex}:${buyOffer.slug}:${buyOffer.price}`;
    if (buyOfferKeyRef.current === key) {
      return;
    }
    buyOfferKeyRef.current = key;
    setBuySheetOffer(buyOffer);
    setAwaitingEndAfterBuy(false);
    setBuySheetOpen(true);
    setTurnSheetOpen(false);
  }, [canBuyOffer, buyOffer, awaitingEndAfterBuy]);

  const onSurfaceLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSurfaceBox((prev) =>
      prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  };

  const goBackToBoard = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({
        pathname: "/(app)/board",
        params: {
          worldId,
          ...(gameId ? { gameId } : {}),
        },
      });
    }
  }, [worldId, gameId]);

  const leaveExplicit = useCallback(() => {
    skipLeaveOnBlurRef.current = false;
    abortHubEnter();
    // Focus cleanup will leave-hub; navigate now.
    goBackToBoard();
  }, [goBackToBoard]);

  const onPressRosterPerson = useCallback(
    (row: HubRosterRow) => {
      const seated = game?.players.find((p) => p.userId === row.userId);
      if (seated) {
        setInfoPlayer(seated);
        return;
      }
      setInfoPlayer({
        userId: row.userId,
        username: row.username,
        seatIndex: 0,
        turnOrder: 0,
        cash: 0,
        boardIndex: 0,
        pinColor: row.accent,
        resigned: false,
        timeRemainingMs: 0,
        turnTimeouts: 0,
        country: row.country,
        hubId,
        inJail: false,
        jailTurns: 0,
        getOutOfJailFree: 0,
      });
    },
    [game?.players, hubId],
  );

  const openBoard = useCallback(() => {
    skipLeaveOnBlurRef.current = true;
    setTurnSheetOpen(false);
    setBuySheetOpen(false);
    setAwaitingEndAfterBuy(false);
    goBackToBoard();
  }, [goBackToBoard]);

  // Phase 13.1 — prefer Open board when a bank auction starts (board-only UI).
  // Wait for hub turnBusy (dice hold + pin settle mirror) so we do not yank mid-walk.
  const auctionKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const a = game?.auction;
    if (!a || !inHubMarked) {
      if (!a) {
        auctionKeyRef.current = null;
      }
      return;
    }
    if (turnBusy) {
      return;
    }
    const key = `${a.boardIndex}:${a.startedByUserId}`;
    if (auctionKeyRef.current === key) {
      return;
    }
    auctionKeyRef.current = key;
    setBuySheetOpen(false);
    setTurnSheetOpen(false);
    notify({
      type: "info",
      title: "Auction started",
      message: "Opening board for bidding…",
    });
    openBoard();
  }, [game?.auction, inHubMarked, openBoard, turnBusy]);

  // Phase 13.3 — open board when a trade involves the local player.
  const tradeKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const t = game?.trade;
    if (!t || !inHubMarked || !localUserId) {
      if (!t) {
        tradeKeyRef.current = null;
      }
      return;
    }
    if (t.toUserId !== localUserId && t.fromUserId !== localUserId) {
      return;
    }
    if (turnBusy) {
      return;
    }
    const key = `${t.fromUserId}:${t.toUserId}:${t.replyDeadline}`;
    if (tradeKeyRef.current === key) {
      return;
    }
    tradeKeyRef.current = key;
    setBuySheetOpen(false);
    setTurnSheetOpen(false);
    notify({
      type: "info",
      title: "Trade offer",
      message:
        t.toUserId === localUserId
          ? "Opening board to review the trade…"
          : "Opening board — waiting for a reply…",
    });
    openBoard();
  }, [game?.trade, inHubMarked, openBoard, turnBusy, localUserId]);

  // Phase 14.2 — debtor must settle on board (Pay | Bankruptcy / debt-pay).
  const debtKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!inHubMarked || !localUserId || !game || game.status !== "active") {
      if (!game?.pendingPayment && !game?.debtPay) {
        debtKeyRef.current = null;
      }
      return;
    }
    if (turnBusy) {
      return;
    }
    const debtPay = game.debtPay;
    const pending = game.pendingPayment;
    const iAmDebtor = Boolean(
      pending &&
      pending.amount > 0 &&
      (pending.fromUserId === localUserId ||
        (!pending.fromUserId && game.currentUserId === localUserId)),
    );
    const choiceGate =
      iAmDebtor &&
      !debtPay &&
      game.turnPhase === "awaiting_roll" &&
      game.currentUserId === localUserId &&
      (game.canStartDebtPay || game.canBankrupt);
    const payingMine = Boolean(debtPay && debtPay.userId === localUserId);
    if (!choiceGate && !payingMine) {
      if (!pending && !debtPay) {
        debtKeyRef.current = null;
      }
      return;
    }
    const key = debtPay
      ? `pay:${debtPay.userId}:${debtPay.deadline}`
      : `choice:${pending?.fromUserId ?? localUserId}:${pending?.amount ?? 0}:${game.turnPhase}`;
    if (debtKeyRef.current === key) {
      return;
    }
    debtKeyRef.current = key;
    setBuySheetOpen(false);
    setTurnSheetOpen(false);
    notify({
      type: "warning",
      title: choiceGate ? "Settle debt" : "Paying debt",
      message: choiceGate
        ? "Opening board — Pay or Bankruptcy…"
        : "Opening board to raise funds…",
    });
    openBoard();
  }, [
    game?.pendingPayment,
    game?.debtPay,
    game?.turnPhase,
    game?.currentUserId,
    game?.canStartDebtPay,
    game?.canBankrupt,
    game?.status,
    inHubMarked,
    openBoard,
    turnBusy,
    localUserId,
  ]);

  const dismissBuySheet = useCallback(() => {
    setBuySheetOpen(false);
    setAwaitingEndAfterBuy(false);
    setTurnSheetOpen(true);
  }, []);

  const onRoll = useCallback(() => {
    if (!gameId || rollDice.isPending || turnBusy) {
      return;
    }
    rollDice.mutate(undefined, {
      onError: (err: Error) => {
        notify({
          type: "error",
          title: "Roll failed",
          message: err.message || "Could not roll",
        });
      },
    });
  }, [gameId, rollDice, turnBusy]);

  const onEndTurn = useCallback(() => {
    if (!gameId || endTurnMut.isPending || turnBusy) {
      return;
    }
    endTurnMut.mutate(undefined, {
      onSuccess: () => {
        setTurnSheetOpen(false);
        setBuySheetOpen(false);
        setAwaitingEndAfterBuy(false);
        setBuySheetOffer(null);
        buyOfferKeyRef.current = null;
      },
      onError: (err: Error) => {
        notify({
          type: "error",
          title: "End turn failed",
          message: err.message || "Could not end turn",
        });
      },
    });
  }, [gameId, endTurnMut, turnBusy]);

  const onBuy = useCallback(() => {
    if (!gameId || buyMut.isPending || turnBusy) {
      return;
    }
    buyMut.mutate(undefined, {
      onSuccess: () => {
        setAwaitingEndAfterBuy(true);
      },
      onError: (err: Error) => {
        notify({
          type: "error",
          title: "Buy failed",
          message: err.message || "Could not buy",
        });
      },
    });
  }, [gameId, buyMut, turnBusy]);

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.main,
          { paddingLeft: insets.left, paddingRight: insets.right },
        ]}
      >
        <View
          style={[
            styles.mediaRail,
            {
              flex: PANE_FLEX,
              paddingTop: 12 + insets.top,
              paddingBottom: 0,
            },
          ]}
        >
          <HubChatRail
            messages={presence.chatMessages}
            localUserId={localUserId}
            accentByUserId={chatAccentByUserId}
            avatarUrlByUserId={chatAvatarByUserId}
            locationName={hubDisplayName}
            dcOpen={presence.dcOpen}
            onSend={presence.sendChat}
          />
        </View>

        <View
          style={[
            styles.centerRail,
            {
              flex: PANE_FLEX,
              backgroundColor: floorColor,
              borderLeftColor: colors.border,
              borderRightColor: colors.border,
            },
          ]}
          onLayout={onSurfaceLayout}
        >
          {isError ? (
            <Text style={styles.error}>
              {error instanceof Error ? error.message : "Failed to load hub"}
            </Text>
          ) : null}
          {isLoading && !location ? (
            <ActivityIndicator color={colors.brand} />
          ) : null}
          <HubLocationCopy
            floorColor={floorColor}
            title={hubDisplayName}
            shortName={code}
            blurb={hubBlurb}
            blurbLines={blurbLines}
            iconPath={location?.assets?.icon}
            paddingVertical={copyPadV}
          />
          {surfaceReady ? (
            <View style={styles.avatarLayer} pointerEvents="box-none">
              <HubScene
                width={surfaceW}
                height={surfaceH}
                local={{
                  poseX: walk.poseX,
                  poseY: walk.poseY,
                  radius: walk.avatarRadius,
                  initials: walk.initials,
                  accent: localAccent,
                  imageUrl:
                    (typeof me.data?.avatarUrl === "string" &&
                      me.data.avatarUrl.trim()) ||
                    (typeof localPlayer?.avatarUrl === "string" &&
                      localPlayer.avatarUrl.trim()) ||
                    null,
                }}
                registryRemotes={registryRemotes}
                poseRegistry={presence.poseRegistry}
                remoteRadius={walk.avatarRadius}
              />
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.panelRail,
            {
              flex: PANE_FLEX,
              paddingTop: 10 + insets.top,
              paddingBottom: DOCK_PAD + JOYSTICK_SIZE,
            },
          ]}
        >
          <HubRoster
            rows={rosterRows}
            locationName={hubDisplayName}
            onPressPerson={onPressRosterPerson}
            statusSlot={
              <HubMediaRail
                presenceStatus={presence.status}
                dcOpen={presence.dcOpen}
                bankLabel={bankLabel}
              />
            }
            headerRight={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Leave hub"
                hitSlop={12}
                onPress={leaveExplicit}
                style={({ pressed }) => [
                  styles.closeBtn,
                  pressed ? styles.pressed : null,
                ]}
              >
                <MaterialCommunityIcons
                  name="location-exit"
                  size={22}
                  color={colors.ink}
                />
              </Pressable>
            }
          />

          <View
            style={[
              styles.joystickDock,
              {
                right: DOCK_PAD,
                bottom: DOCK_PAD,
              },
            ]}
            pointerEvents="box-none"
          >
            <Joystick
              onStick={walk.setStick}
              size={JOYSTICK_SIZE}
              accent={localAccent}
            />
          </View>
        </View>
      </View>

      <HubTurnSheet
        visible={turnSheetOpen && isMyTurn && inHubMarked && !showBuySheet}
        bankLabel={bankLabel}
        canRoll={canRoll}
        canEnd={canEnd}
        turnBusy={turnBusy}
        rollPending={rollDice.isPending}
        endPending={endTurnMut.isPending}
        onRoll={onRoll}
        onEndTurn={onEndTurn}
        onOpenBoard={openBoard}
        onDismiss={() => setTurnSheetOpen(false)}
        dismissLabel={`Stay in ${code || "hub"}`}
      />

      {buySheetOffer ? (
        <HubBuySheet
          visible={showBuySheet}
          offer={buySheetOffer}
          bankLabel={bankLabel}
          canBuy={Boolean(buyOffer && game?.canBuy)}
          canEnd={canEnd}
          canAfford={canAffordBuy}
          buyPending={buyMut.isPending}
          endPending={endTurnMut.isPending}
          turnBusy={turnBusy}
          onBuy={onBuy}
          onEndTurn={onEndTurn}
          onOpenBoard={openBoard}
          onDismiss={dismissBuySheet}
        />
      ) : null}

      <PlayerInfoModal
        visible={Boolean(infoPlayer)}
        player={infoPlayer}
        isLocal={Boolean(
          infoPlayer && localUserId && infoPlayer.userId === localUserId,
        )}
        hubCode={code}
        onClose={() => setInfoPlayer(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  main: {
    flex: 1,
    flexDirection: "row",
    minHeight: 0,
  },
  mediaRail: {
    flexShrink: 0,
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    paddingHorizontal: 0,
    gap: 0,
    overflow: "hidden",
  },
  centerRail: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 0,
    overflow: "hidden",
    borderLeftWidth: CENTER_EDGE,
    borderRightWidth: CENTER_EDGE,
  },
  avatarLayer: {
    ...(StyleSheet.absoluteFill as object),
    zIndex: 20,
    elevation: 20,
  },
  panelRail: {
    flexShrink: 0,
    alignSelf: "stretch",
    minHeight: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    overflow: "hidden",
    position: "relative",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.danger,
    textAlign: "center",
    marginBottom: 8,
  },
  joystickDock: {
    position: "absolute",
    zIndex: 30,
  },
});
