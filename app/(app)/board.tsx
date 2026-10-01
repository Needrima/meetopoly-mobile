import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Location } from "@/api/types";
import { AuctionOverlay } from "@/components/board/AuctionOverlay";
import { Board } from "@/components/board/Board";
import { BoardOverflowMenu } from "@/components/board/BoardOverflowMenu";
import { BoardPanel } from "@/components/board/BoardPanel";
import { BuyPropertyOverlay } from "@/components/board/BuyPropertyOverlay";
import { DebtOverlay } from "@/components/board/DebtOverlay";
import { EconomyEventOverlay } from "@/components/board/EconomyEventOverlay";
import { EconomyModeSheet } from "@/components/board/EconomyModeSheet";
import { JailActionSheet } from "@/components/board/JailActionSheet";
import { TileInfoOverlay } from "@/components/board/TileInfoOverlay";
import { TradeOverlay } from "@/components/board/TradeOverlay";
import { layoutBoardRing } from "@/components/board/boardLayout";
import { DiceRollOverlay } from "@/components/board/DiceRollOverlay";
import { InfoModal } from "@/components/ui/InfoModal";
import { useLogout, useMe } from "@/hooks/useAuth";
import { useBlockHardwareBack } from "@/hooks/useBlockHardwareBack";
import { useBoardSession } from "@/hooks/useBoardSession";
import { useBoardWalk, type AvatarColorKey } from "@/hooks/useBoardWalk";
import { useDiceRollMotion } from "@/hooks/useDiceRollMotion";
import { useDeckDrawFly } from "@/hooks/useDeckDrawFly";
import { useEconomyEventQueue } from "@/hooks/useEconomyEventQueue";
import { useEconomyFeedback } from "@/hooks/useEconomyFeedback";
import {
  useGame,
  useAcceptTrade,
  useAuctionBid,
  useAuctionFold,
  useBankruptGame,
  useBuyProperty,
  useBuildOnDeed,
  useDeclineTrade,
  useEndTurn,
  useEnterHub,
  useMortgageDeed,
  usePayJailFine,
  useProposeTrade,
  useRedeemDeed,
  useResignGame,
  useRollDice,
  useSellBuilding,
  useStartAuction,
  useStartDebtPay,
  useUseJailCard,
} from "@/hooks/useGame";
import {
  useClearEconomyWhenOffTurn,
  useEconomyMode,
} from "@/hooks/useEconomyMode";
import { useBoardPresence } from "@/hooks/useBoardPresence";
import { useGamePinMotion } from "@/hooks/useGamePinMotion";
import { DEFAULT_WORLD_ID, useLocations } from "@/hooks/useLocations";
import { useSession } from "@/hooks/useSession";
import { notify } from "@/lib/notify";
import { formatUsername } from "@/lib/formatUsername";
import { eligibleTilesForMode } from "@/lib/economyEligibility";
import { beginHubEnter } from "@/lib/hubEnterGuard";
import { buildBoardRemoteAvatars } from "@/lib/buildBoardRemoteAvatars";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

const PANEL_MIN = 168;

/**
 * Board play surface; leave via panel ⋯; avatar pose via Reanimated.
 * Phase 6.2b: synced dice tumble, then tile-by-tile pin motion.
 * Phase 6.2c: Leave = resign (confirm); last active player wins.
 * Phase 6.4: Buy unowned property at list price.
 * Phase 7.2: remote presence avatars interpolated on the board (pins from game WS).
 * Phase 7.4: dual presence — Roll moves pins only; avatars keep walking on DataChannel;
 * presence disconnect on leave; PC/DC recover does not touch game WS.
 * Phase 8.0: board presence pauses while hub is focused; game WS stays up.
 * Keep-awake while this screen is mounted (incl. hub stacked) so idle sleep
 * does not drop game WS / presence WebRTC.
 */
export default function BoardScreen() {
  useKeepAwake("meetopoly-board", { suppressDeactivateWarnings: true });
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ worldId?: string; gameId?: string }>();
  const worldId =
    typeof params.worldId === "string" && params.worldId.trim().length > 0
      ? params.worldId.trim()
      : DEFAULT_WORLD_ID;
  const gameId =
    typeof params.gameId === "string" && params.gameId.trim().length > 0
      ? params.gameId.trim()
      : null;
  const { token, user } = useSession();
  const me = useMe(Boolean(token));
  const logout = useLogout();
  const { snapshot, saveSnapshot } = useBoardSession();
  const { data, error, isLoading, isError } = useLocations(worldId);
  const gameQuery = useGame(gameId);
  /** Leave board SFU room while hub is stacked; reconnect on Leave hub. */
  const [boardPresenceOn, setBoardPresenceOn] = useState(true);
  /** Economy modals only while board focused (hub stack owns toasts). */
  const [boardFocused, setBoardFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setBoardPresenceOn(true);
      setBoardFocused(true);
      return () => {
        setBoardPresenceOn(false);
        setBoardFocused(false);
      };
    }, []),
  );
  const presence = useBoardPresence(gameId, boardPresenceOn);
  const rollDice = useRollDice(gameId);
  const endTurnMut = useEndTurn(gameId);
  const buyMut = useBuyProperty(gameId);
  const startAuctionMut = useStartAuction(gameId);
  const auctionBidMut = useAuctionBid(gameId);
  const auctionFoldMut = useAuctionFold(gameId);
  const proposeTradeMut = useProposeTrade(gameId);
  const acceptTradeMut = useAcceptTrade(gameId);
  const declineTradeMut = useDeclineTrade(gameId);
  const bankruptMut = useBankruptGame(gameId);
  const startDebtPayMut = useStartDebtPay(gameId);
  const buildMut = useBuildOnDeed(gameId);
  const sellMut = useSellBuilding(gameId);
  const mortgageMut = useMortgageDeed(gameId);
  const redeemMut = useRedeemDeed(gameId);
  const resignMut = useResignGame(gameId);
  const payJailMut = usePayJailFine(gameId);
  const useJailCardMut = useUseJailCard(gameId);
  const economy = useEconomyMode();
  const enterHubMut = useEnterHub(gameId);
  const game = gameQuery.data ?? null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [inspectIndex, setInspectIndex] = useState<number | null>(null);
  /** 12.4b — after "Roll a Double", modal closes and dock Roll unlocks. */
  const [jailAttemptArmed, setJailAttemptArmed] = useState(false);
  /** 13.1 — hold dock eye to peek board under auction. */
  const [auctionPeeking, setAuctionPeeking] = useState(false);
  /** 13.3 — compose trade / peek under trade overlay. */
  const [tradeComposeOpen, setTradeComposeOpen] = useState(false);
  const [tradePeeking, setTradePeeking] = useState(false);
  const startedToastRef = useRef(false);
  const finishedHandledRef = useRef(false);
  const resignToastRef = useRef<string>("");
  const forfeitToastRef = useRef<string>("");
  const localLeavingRef = useRef(false);
  const {
    current: economyEvent,
    hasCard: economyHasCard,
    enqueue: enqueueEconomy,
  } = useEconomyEventQueue();

  const username = me.data?.username ?? user?.username ?? null;
  const sessionUserId = me.data?.id ?? user?.id ?? null;
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

  const localGamePinColor = useMemo(() => {
    if (!game) {
      return null;
    }
    const byId = localUserId
      ? game.players.find((p) => p.userId === localUserId)
      : null;
    if (byId?.pinColor) {
      return byId.pinColor;
    }
    if (!username) {
      return null;
    }
    const key = formatUsername(username).toLowerCase();
    return (
      game.players.find((p) => formatUsername(p.username).toLowerCase() === key)
        ?.pinColor ?? null
    );
  }, [game, localUserId, username]);

  useBlockHardwareBack(true);

  useEffect(() => {
    if (!game || startedToastRef.current) {
      return;
    }
    startedToastRef.current = true;
    if (game.status === "finished") {
      finishedHandledRef.current = true;
      setWinnerOpen(true);
      return;
    }
    notify({
      type: "success",
      title: "Game started",
      message: `${game.players.length} players · ${formatUsername(game.currentUsername)}'s turn`,
    });
  }, [game]);

  const availableW = winW - insets.left - insets.right;
  const boardSide = Math.max(0, Math.min(winH, availableW - PANEL_MIN));
  const locations = data?.locations ?? [];

  const layout = useMemo(
    () =>
      boardSide > 0 && locations.length
        ? layoutBoardRing(boardSide, locations)
        : null,
    [boardSide, locations],
  );

  const restorePoseNorm =
    snapshot?.worldId === worldId && snapshot.hasPose
      ? snapshot.poseNorm
      : null;
  const restoreAccent =
    snapshot?.worldId === worldId && snapshot.accent
      ? { key: snapshot.accentKey, hex: snapshot.accent }
      : null;

  const onAccentReady = useCallback(
    (accent: { key: AvatarColorKey; hex: string }) => {
      if (snapshot?.accent && snapshot.worldId === worldId) {
        return;
      }
      saveSnapshot({
        worldId,
        poseNorm: { x: 0.5, y: 0.5 },
        hasPose: false,
        accent: accent.hex,
        accentKey: accent.key,
        initials: usernameInitialSafe(username),
      });
    },
    [saveSnapshot, snapshot?.accent, snapshot?.worldId, username, worldId],
  );

  const walk = useBoardWalk({
    layout,
    locations,
    username,
    enabled: Boolean(layout) && !isLoading && !isError,
    restorePoseNorm,
    restoreAccent,
    onAccentReady,
  });

  // Phase 7.1–7.2 — publish local pose ~10 Hz; remotes drawn + interpolated on Board.
  const getPoseRef = useRef(walk.getPose);
  getPoseRef.current = walk.getPose;
  const sendPoseRef = useRef(presence.sendPose);
  sendPoseRef.current = presence.sendPose;
  useEffect(() => {
    if (!layout || !presence.dcOpen || !gameId) {
      return;
    }
    const size = layout.size;
    const tick = () => {
      const pose = getPoseRef.current();
      sendPoseRef.current({
        x: pose.x / size,
        y: pose.y / size,
      });
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [layout, presence.dcOpen, gameId]);

  const remoteAvatars = useMemo(() => {
    if (!layout) {
      return [];
    }
    return buildBoardRemoteAvatars({
      layout,
      locations,
      players: game?.players ?? [],
      remotes: presence.remotes,
      localUserId,
      fallbackAccent: colors.muted,
    });
  }, [layout, locations, game?.players, presence.remotes, localUserId]);

  /** Lobby/game seat color wins over random walk accent. */
  const displayAccent = localGamePinColor ?? walk.accent;

  const pinRadius = layout ? Math.max(6, Math.round(layout.size * 0.018)) : 8;
  const {
    rolling: diceRolling,
    holdPinWalk,
    overlay: diceOverlay,
  } = useDiceRollMotion(game);
  const { pins: motionPins, animating: pinAnimating, cardHold } =
    useGamePinMotion({
      layout,
      game,
      localUserId,
      pinRadius,
      holdWalk: holdPinWalk,
      localAccent: displayAccent,
    });
  // During Chance/Chest reveal hold, pin is still "busy" for End/Roll but
  // economy feedback must present the card modal (not wait for full settle).
  const pinEconomyIdle = holdPinWalk || (pinAnimating && !cardHold);

  const {
    fly: deckDrawFly,
    busy: deckFlyBusy,
    onFlyComplete: onDeckDrawFlyComplete,
  } = useDeckDrawFly({
    lastCard: game?.lastCard,
    decks: layout?.decks,
    boardSize: layout?.size ?? 0,
    ready: Boolean(layout && !pinEconomyIdle),
    gameReady: Boolean(game),
    enabled: boardFocused,
  });

  // Fly-off finishes before Chance/Chest modal (and other idle-gated feedback).
  const economyWaitIdle = pinEconomyIdle || deckFlyBusy;
  // Salary waits for card modal + full pin resume (Advance to GO, wrap trips).
  const salaryWaitIdle =
    holdPinWalk || pinAnimating || deckFlyBusy || economyHasCard;
  // Block End/Roll during fly + any economy celebration (incl. non-move cards).
  const turnBusy =
    holdPinWalk || pinAnimating || deckFlyBusy || economyHasCard;

  // Phase 9.3 / 12.4 — economy modals (involved) / toasts (spectators).
  useEconomyFeedback({
    game,
    locations,
    localUserId,
    waitIdle: economyWaitIdle,
    salaryWaitIdle,
    displayAccent,
    surface: "board",
    enqueueModal: enqueueEconomy,
    enabled: boardFocused,
  });

  // Phase 6.2c / 13.2 — resign + turn-clock forfeit toasts + finished via game WS.
  useEffect(() => {
    if (!game || !localUserId) {
      return;
    }

    const lf = game.lastForfeit;
    if (lf?.userId) {
      const forfeitKey = `${lf.userId}:${lf.reason}:${lf.strikes ?? 0}`;
      if (forfeitKey !== forfeitToastRef.current) {
        forfeitToastRef.current = forfeitKey;
        const isYou = lf.userId === localUserId;
        const who = isYou ? "You" : formatUsername(lf.username) || "Someone";
        if (lf.reason === "turn_strike") {
          notify({
            type: "warning",
            title: "Turn forfeit",
            message: `${who} forfeited a turn, one more strike`,
          });
        } else if (lf.reason === "turn_timeout") {
          notify({
            type: isYou ? "error" : "info",
            title: "Turn forfeit",
            message: `${who} forfeited the game`,
          });
        }
      }
    }

    const resignedSig = game.players
      .filter((p) => p.resigned)
      .map((p) => p.userId)
      .sort()
      .join(",");
    if (resignedSig && resignedSig !== resignToastRef.current) {
      const prev = new Set(
        resignToastRef.current ? resignToastRef.current.split(",") : [],
      );
      const newlyOut = game.players.filter(
        (p) => p.resigned && !prev.has(p.userId),
      );
      resignToastRef.current = resignedSig;
      for (const p of newlyOut) {
        presence.clearRemote?.(p.userId);
        // Turn-timeout kicks are toasted via lastForfeit above.
        const timedOut =
          game.lastForfeit?.userId === p.userId &&
          game.lastForfeit.reason === "turn_timeout";
        if (timedOut || p.userId === localUserId || localLeavingRef.current) {
          continue;
        }
        notify({
          type: "info",
          title: "Player left",
          message: `${formatUsername(p.username)} resigned`,
        });
      }
    }
    if (game.status === "finished" && !finishedHandledRef.current) {
      finishedHandledRef.current = true;
      setLeaveConfirmOpen(false);
      setWinnerOpen(true);
      const iWon = game.winnerUserId === localUserId;
      notify({
        type: "success",
        title: iWon ? "You win" : "Game over",
        message: iWon
          ? "Last player standing"
          : `${formatUsername(game.winnerUsername) || "Someone"} wins`,
      });
    }
  }, [game, localUserId, presence.clearRemote]);

  const persistAndEnter = useCallback(
    (loc: Location) => {
      if (!layout) {
        return;
      }
      setMenuOpen(false);
      const pose = walk.getPose();
      saveSnapshot({
        worldId,
        poseNorm: {
          x: pose.x / layout.size,
          y: pose.y / layout.size,
        },
        hasPose: true,
        accent: displayAccent,
        accentKey: walk.accentKey,
        initials: walk.initials,
      });
      // Phase 8.2: fan out hubId on game WS; 8.0 presence switches on blur.
      // Phase 8.4: hubRevision + abort so leave cannot lose to a late enter.
      const hubId = loc.hubId?.trim();
      if (gameId && hubId) {
        const signal = beginHubEnter();
        const hubRevision =
          game?.players.find((p) => p.userId === localUserId)?.hubRevision ?? 0;
        enterHubMut.mutate(
          { hubId, hubRevision, signal },
          {
            onError: (err) => {
              if (err?.name === "AbortError") {
                return;
              }
              console.warn("[hub] enter-hub failed", err);
            },
          },
        );
      }
      router.push({
        pathname: "/(app)/hub/[slug]",
        params: {
          slug: loc.slug,
          worldId,
          ...(gameId ? { gameId } : {}),
        },
      });
    },
    [
      layout,
      saveSnapshot,
      walk,
      worldId,
      gameId,
      game?.players,
      localUserId,
      displayAccent,
      enterHubMut.mutate,
    ],
  );

  const leaveBoard = useCallback(() => {
    presence.disconnect();
    router.replace("/(app)/worlds");
  }, [presence.disconnect]);

  const requestLeave = useCallback(() => {
    setMenuOpen(false);
    if (gameId && game && game.status === "active") {
      setLeaveConfirmOpen(true);
      return;
    }
    leaveBoard();
  }, [game, gameId, leaveBoard]);

  const confirmResign = useCallback(() => {
    if (!gameId || resignMut.isPending) {
      return;
    }
    localLeavingRef.current = true;
    resignMut.mutate(undefined, {
      onSuccess: (next) => {
        setLeaveConfirmOpen(false);
        if (next.status === "finished") {
          finishedHandledRef.current = true;
          setWinnerOpen(true);
          notify({
            type: "info",
            title: "Game over",
            message: `${formatUsername(next.winnerUsername) || "Someone"} wins`,
          });
          return;
        }
        notify({
          type: "info",
          title: "You resigned",
          message: "Left the game",
        });
        leaveBoard();
      },
      onError: (err: Error) => {
        localLeavingRef.current = false;
        notify({
          type: "error",
          title: "Could not leave",
          message: err.message || "Resign failed",
        });
      },
    });
  }, [gameId, resignMut, leaveBoard]);

  const dismissWinner = useCallback(() => {
    setWinnerOpen(false);
    leaveBoard();
  }, [leaveBoard]);

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
      onError: (err: Error) => {
        notify({
          type: "error",
          title: "Buy failed",
          message: err.message || "Could not buy",
        });
      },
    });
  }, [gameId, buyMut, turnBusy]);

  const onStartAuction = useCallback(() => {
    if (!gameId || startAuctionMut.isPending || turnBusy) {
      return;
    }
    startAuctionMut.mutate(undefined, {
      onError: (err: Error) => {
        notify({
          type: "error",
          title: "Auction failed",
          message: err.message || "Could not start auction",
        });
      },
    });
  }, [gameId, startAuctionMut, turnBusy]);

  const onAuctionBid = useCallback(
    (amount: number) => {
      if (!gameId || auctionBidMut.isPending) {
        return;
      }
      auctionBidMut.mutate(amount, {
        onError: (err: Error) => {
          notify({
            type: "error",
            title: "Bid failed",
            message: err.message || "Could not bid",
          });
        },
      });
    },
    [gameId, auctionBidMut],
  );

  const onAuctionFold = useCallback(() => {
    if (!gameId || auctionFoldMut.isPending) {
      return;
    }
    auctionFoldMut.mutate(undefined, {
      onError: (err: Error) => {
        notify({
          type: "error",
          title: "Fold failed",
          message: err.message || "Could not fold",
        });
      },
    });
  }, [gameId, auctionFoldMut]);

  const onStartDebtPay = useCallback(() => {
    if (!gameId || startDebtPayMut.isPending || turnBusy) {
      return;
    }
    startDebtPayMut.mutate(undefined, {
      onError: (err: Error) => {
        notify({
          type: "error",
          title: "Could not start pay",
          message: err.message || "Could not open debt-pay window",
        });
      },
    });
  }, [gameId, startDebtPayMut, turnBusy]);

  const onBankrupt = useCallback(() => {
    if (!gameId || bankruptMut.isPending) {
      return;
    }
    bankruptMut.mutate(undefined, {
      onError: (err: Error) => {
        notify({
          type: "error",
          title: "Bankruptcy failed",
          message: err.message || "Could not declare bankruptcy",
        });
      },
    });
  }, [gameId, bankruptMut]);

  const onPayJailFine = useCallback(() => {
    if (!gameId || payJailMut.isPending || turnBusy) {
      return;
    }
    payJailMut.mutate(undefined, {
      onError: (err: Error) => {
        notify({
          type: "error",
          title: "Jail fine failed",
          message: err.message || "Could not pay fine",
        });
      },
    });
  }, [gameId, payJailMut, turnBusy]);

  const onUseJailCard = useCallback(() => {
    if (!gameId || useJailCardMut.isPending || turnBusy) {
      return;
    }
    useJailCardMut.mutate(undefined, {
      onError: (err: Error) => {
        notify({
          type: "error",
          title: "Jail card failed",
          message: err.message || "Could not use card",
        });
      },
    });
  }, [gameId, useJailCardMut, turnBusy]);

  const onJailRollDoubles = useCallback(() => {
    setJailAttemptArmed(true);
  }, []);

  const onOpenTrade = useCallback(() => {
    economy.clearMode();
    setTradePeeking(false);
    setTradeComposeOpen(true);
  }, [economy]);

  const onProposeTrade = useCallback(
    (args: {
      toUserId: string;
      give: { cash: number; boardIndexes: number[]; getOutOfJailFree: number };
      take: { cash: number; boardIndexes: number[]; getOutOfJailFree: number };
    }) => {
      if (!gameId || proposeTradeMut.isPending) {
        return;
      }
      proposeTradeMut.mutate(args, {
        onSuccess: () => {
          setTradeComposeOpen(false);
        },
        onError: (err: Error) => {
          notify({
            type: "error",
            title: "Trade failed",
            message: err.message || "Could not send offer",
          });
        },
      });
    },
    [gameId, proposeTradeMut],
  );

  const onAcceptTrade = useCallback(
    (mortgageAction?: "redeem_all" | "leave_all") => {
      if (!gameId || acceptTradeMut.isPending) {
        return;
      }
      acceptTradeMut.mutate(
        mortgageAction ? { mortgageAction } : {},
        {
          onError: (err: Error) => {
            notify({
              type: "error",
              title: "Accept failed",
              message: err.message || "Could not accept trade",
            });
          },
        },
      );
    },
    [gameId, acceptTradeMut],
  );

  const onDeclineTrade = useCallback(() => {
    if (!gameId || declineTradeMut.isPending) {
      return;
    }
    declineTradeMut.mutate(undefined, {
      onError: (err: Error) => {
        notify({
          type: "error",
          title: "Decline failed",
          message: err.message || "Could not decline trade",
        });
      },
    });
  }, [gameId, declineTradeMut]);

  const boardPins = game ? motionPins : walk.pins;
  const isMyTurn = Boolean(
    game && localUserId && game.currentUserId === localUserId,
  );
  const buyOffer = game?.buyOffer ?? null;
  const auction = game?.auction ?? null;
  const trade = game?.trade ?? null;
  const localInTrade = Boolean(
    trade &&
      localUserId &&
      (trade.toUserId === localUserId || trade.fromUserId === localUserId),
  );
  // Chance/Chest reveal (hold or anywhere in the economy queue) must finish
  // before buy — lock A opens buyOffer on the server during the card modal.
  const cardRevealBlocking = cardHold || economyHasCard;
  const showBuyModal = Boolean(
    buyOffer &&
    isMyTurn &&
    game?.status === "active" &&
    game.canBuy &&
    !turnBusy &&
    !cardRevealBlocking &&
    !auction &&
    !trade,
  );
  // Server may attach auction on roll/landing (e.g. broke auto-auction) before
  // dice hold + pin walk finish — wait like buy so the overlay does not cover motion.
  const showAuctionModal = Boolean(
    auction &&
      game?.status === "active" &&
      !turnBusy &&
      !cardRevealBlocking,
  );
  // Trade modal: compose (proposer) OR pending only for parties to the offer
  // (proposer waiting / target review) — never for third seated players.
  const showTradeModal = Boolean(
    game &&
      game.status === "active" &&
      localUserId &&
      ((localInTrade && !turnBusy) || tradeComposeOpen),
  );
  const debtPay = game?.debtPay ?? null;
  const pendingPayment = game?.pendingPayment ?? null;
  const localInDebt = Boolean(
    pendingPayment &&
      pendingPayment.amount > 0 &&
      localUserId &&
      (pendingPayment.fromUserId === localUserId ||
        (!pendingPayment.fromUserId && isMyTurn)),
  );
  // Next-turn gate only (landing turn stays End OK / no Pay sheet).
  const showDebtChoice = Boolean(
    game &&
      game.status === "active" &&
      isMyTurn &&
      localInDebt &&
      !debtPay &&
      game.turnPhase === "awaiting_roll" &&
      !turnBusy &&
      !cardRevealBlocking &&
      !auction &&
      !trade &&
      (game.canStartDebtPay || game.canBankrupt),
  );
  const showDebtPaying = Boolean(
    game && game.status === "active" && debtPay && !showDebtChoice,
  );

  const tradeEnabled = Boolean(
    isMyTurn &&
      game?.canProposeTrade &&
      !turnBusy &&
      !showAuctionModal &&
      !showBuyModal &&
      !showDebtChoice &&
      !showDebtPaying &&
      !trade &&
      !tradeComposeOpen,
  );

  useEffect(() => {
    if (!showAuctionModal) {
      setAuctionPeeking(false);
    }
  }, [showAuctionModal]);

  useEffect(() => {
    if (showDebtChoice) {
      setTradeComposeOpen(false);
      economy.clearMode();
    }
  }, [showDebtChoice, economy.clearMode]);

  // Only react when trade opens/closes — not on every WS state refresh (that
  // would cancel hold-to-peek mid-press).
  const tradeKey = trade
    ? `${trade.fromUserId}:${trade.toUserId}:${trade.replyDeadline}`
    : null;
  useEffect(() => {
    setTradePeeking(false);
    if (!tradeKey) {
      return;
    }
    setTradeComposeOpen(false);
    economy.clearMode();
  }, [tradeKey, economy.clearMode]);

  useEffect(() => {
    if (!showTradeModal) {
      setTradePeeking(false);
    }
  }, [showTradeModal]);

  // Compose is local-only and does not pause the turn clock — close it when
  // the turn ends (timeout strike, end turn, forfeit). Pending server trade
  // still shows via `trade` even when it is not your turn (target review).
  useEffect(() => {
    if (!isMyTurn) {
      setTradeComposeOpen(false);
    }
  }, [isMyTurn]);

  const localGamePlayer = game?.players.find((p) => p.userId === localUserId);

  // Clear armed doubles try when leave jail or leave awaiting_roll (after roll / end).
  useEffect(() => {
    if (!localGamePlayer?.inJail || game?.turnPhase !== "awaiting_roll") {
      setJailAttemptArmed(false);
    }
  }, [localGamePlayer?.inJail, game?.turnPhase]);

  const showJailSheet = Boolean(
    game &&
      game.status === "active" &&
      isMyTurn &&
      localGamePlayer?.inJail &&
      game.turnPhase === "awaiting_roll" &&
      !jailAttemptArmed &&
      !turnBusy &&
      !showBuyModal &&
      !showAuctionModal &&
      !showTradeModal &&
      !showDebtChoice &&
      !showDebtPaying &&
      (game.canPayJailFine || game.canUseJailCard || game.canRoll),
  );

  useClearEconomyWhenOffTurn(
    economy.clearMode,
    Boolean(game && game.status === "active" && isMyTurn),
  );

  const economyEligibleByIndex = useMemo(() => {
    const map = new Map<number, number>();
    if (!game || !localUserId || !economy.mode) {
      return map;
    }
    for (const t of eligibleTilesForMode(
      economy.mode,
      game,
      locations,
      localUserId,
    )) {
      map.set(t.boardIndex, t.amount);
    }
    return map;
  }, [game, locations, localUserId, economy.mode]);

  const economyBusy =
    buildMut.isPending ||
    sellMut.isPending ||
    mortgageMut.isPending ||
    redeemMut.isPending;

  const onEconomyTile = useCallback(
    (boardIndex: number) => {
      if (!economy.mode || economyBusy || turnBusy) {
        return;
      }
      if (!economyEligibleByIndex.has(boardIndex)) {
        return;
      }
      const onError = (err: Error) => {
        notify({
          type: "error",
          title: "Action failed",
          message: err.message || "Could not complete action",
        });
      };
      switch (economy.mode) {
        case "build":
          buildMut.mutate(boardIndex, { onError });
          break;
        case "sell":
          sellMut.mutate(boardIndex, { onError });
          break;
        case "mortgage":
          mortgageMut.mutate(boardIndex, { onError });
          break;
        case "redeem":
          redeemMut.mutate(boardIndex, { onError });
          break;
      }
    },
    [
      economy.mode,
      economyBusy,
      turnBusy,
      economyEligibleByIndex,
      buildMut,
      sellMut,
      mortgageMut,
      redeemMut,
    ],
  );

  // Buyer must not open inspect while buy modal is up; clear if it appears.
  useEffect(() => {
    if (showBuyModal && inspectIndex != null) {
      setInspectIndex(null);
    }
  }, [showBuyModal, inspectIndex]);

  const ownerColorByIndex = useMemo(() => {
    const map = new Map<number, string>();
    if (!game) {
      return map;
    }
    const pinByUser = new Map(
      game.players.map((p) => {
        const isLocal = Boolean(localUserId && p.userId === localUserId);
        const color = isLocal && displayAccent ? displayAccent : p.pinColor;
        return [p.userId, color] as const;
      }),
    );
    for (const d of game.deeds ?? []) {
      const color = pinByUser.get(d.ownerUserId);
      if (color) {
        map.set(d.boardIndex, color);
      }
    }
    return map;
  }, [game, localUserId, displayAccent]);

  const inspectLoc =
    inspectIndex != null
      ? (locations.find((l) => l.boardIndex === inspectIndex) ?? null)
      : null;
  const inspectOwner = useMemo(() => {
    if (!game || inspectIndex == null) {
      return null;
    }
    const deed = (game.deeds ?? []).find((d) => d.boardIndex === inspectIndex);
    if (!deed) {
      return null;
    }
    const player = game.players.find((p) => p.userId === deed.ownerUserId);
    const isLocalOwner = Boolean(
      localUserId && deed.ownerUserId === localUserId,
    );
    return {
      username: isLocalOwner
        ? "You"
        : formatUsername(deed.ownerUsername || player?.username || "Player"),
      pinColor:
        isLocalOwner && displayAccent
          ? displayAccent
          : (player?.pinColor ?? colors.muted),
    };
  }, [game, inspectIndex, localUserId, displayAccent]);

  const onTilePress = useCallback(
    (boardIndex: number) => {
      if (showBuyModal) {
        return;
      }
      if (economy.mode) {
        onEconomyTile(boardIndex);
        return;
      }
      setInspectIndex(boardIndex);
    },
    [showBuyModal, economy.mode, onEconomyTile],
  );

  const buyLoc = buyOffer
    ? (locations.find((l) => l.boardIndex === buyOffer.boardIndex) ?? null)
    : null;
  const localCash =
    game?.players.find((p) => p.userId === localUserId)?.cash ?? 0;
  const canAffordBuy = Boolean(buyOffer && localCash >= buyOffer.price);
  const debtAmountOwed = Math.max(0, pendingPayment?.amount ?? 0);
  const debtOwedToLabel = pendingPayment?.toUsername
    ? formatUsername(pendingPayment.toUsername) || "Bank"
    : pendingPayment?.toUserId
      ? "player"
      : "Bank";
  const debtPayUser =
    debtPay && game
      ? game.players.find((p) => p.userId === debtPay.userId)
      : null;
  const auctionLoc = auction
    ? (locations.find((l) => l.boardIndex === auction.boardIndex) ?? null)
    : null;

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.main,
          { paddingLeft: insets.left, paddingRight: insets.right },
        ]}
      >
        <View
          style={[styles.boardRail, { width: boardSide, height: boardSide }]}
        >
          {isLoading || (gameId && gameQuery.isLoading) ? (
            <View style={styles.boardState}>
              <ActivityIndicator color={colors.onBrand} />
              <Text style={styles.boardStateText}>
                Loading {gameId ? "game" : worldId}…
              </Text>
            </View>
          ) : null}

          {isError || gameQuery.isError ? (
            <View style={styles.boardState}>
              <Text style={styles.boardStateError}>
                {error instanceof Error
                  ? error.message
                  : gameQuery.error instanceof Error
                    ? gameQuery.error.message
                    : "Failed to load board"}
              </Text>
            </View>
          ) : null}

          {!isLoading &&
          !isError &&
          !gameQuery.isError &&
          layout &&
          !(gameId && gameQuery.isLoading) ? (
            <Board
              size={boardSide}
              locations={locations}
              layout={layout}
              highlightedBoardIndex={
                economy.mode ? null : (walk.nearby?.boardIndex ?? null)
              }
              economyEligibleByIndex={
                economy.mode ? economyEligibleByIndex : undefined
              }
              economyModeActive={Boolean(economy.mode)}
              ownerColorByIndex={ownerColorByIndex}
              deeds={game?.deeds}
              onTilePress={
                showBuyModal ||
                showAuctionModal ||
                showDebtChoice ||
                showTradeModal
                  ? undefined
                  : onTilePress
              }
              avatar={{
                poseX: walk.poseX,
                poseY: walk.poseY,
                radius: walk.avatarRadius,
                initials: walk.initials,
                accent: displayAccent,
              }}
              remotes={remoteAvatars}
              pins={boardPins}
              deckDrawFly={deckDrawFly}
              onDeckDrawFlyComplete={onDeckDrawFlyComplete}
            />
          ) : null}
          {diceOverlay ? (
            <DiceRollOverlay
              visible
              rolling={diceRolling}
              die1={diceOverlay.die1}
              die2={diceOverlay.die2}
              username={formatUsername(diceOverlay.username)}
              isDoubles={diceOverlay.isDoubles}
            />
          ) : null}
          {buyOffer ? (
            <BuyPropertyOverlay
              visible={showBuyModal}
              offer={buyOffer}
              location={buyLoc}
              canAfford={canAffordBuy}
              canAuction={Boolean(game?.canStartAuction)}
              buyPending={buyMut.isPending}
              auctionPending={startAuctionMut.isPending}
              onBuy={onBuy}
              onAuction={onStartAuction}
            />
          ) : null}
          {auction ? (
            <AuctionOverlay
              visible={showAuctionModal}
              peeking={auctionPeeking}
              auction={auction}
              location={auctionLoc}
              localUserId={localUserId}
              localCash={localCash}
              bidPending={auctionBidMut.isPending}
              foldPending={auctionFoldMut.isPending}
              onBid={onAuctionBid}
              onFold={onAuctionFold}
            />
          ) : null}
          {game && localUserId && showTradeModal ? (
            <TradeOverlay
              visible={showTradeModal}
              peeking={tradePeeking}
              game={game}
              locations={locations}
              localUserId={localUserId}
              composing={tradeComposeOpen && !trade}
              proposePending={proposeTradeMut.isPending}
              acceptPending={acceptTradeMut.isPending}
              declinePending={declineTradeMut.isPending}
              onCloseCompose={() => setTradeComposeOpen(false)}
              onPeekBoard={() => setTradePeeking(true)}
              onEndPeek={() => setTradePeeking(false)}
              onPropose={onProposeTrade}
              onAccept={onAcceptTrade}
              onDecline={onDeclineTrade}
            />
          ) : null}
          <DebtOverlay
            choiceVisible={showDebtChoice}
            payingVisible={showDebtPaying}
            amountOwed={debtAmountOwed}
            owedToLabel={debtOwedToLabel}
            debtKind={pendingPayment?.kind}
            avatarInitials={usernameInitialSafe(
              localGamePlayer?.username ?? username,
            )}
            avatarAccent={
              displayAccent ?? localGamePlayer?.pinColor ?? colors.accent
            }
            canPay={Boolean(game?.canStartDebtPay)}
            canBankrupt={Boolean(game?.canBankrupt)}
            payDeadline={debtPay?.deadline}
            payerUsername={formatUsername(
              debtPay?.username ?? debtPayUser?.username,
            )}
            isDebtor={Boolean(
              debtPay && localUserId && debtPay.userId === localUserId,
            )}
            payPending={startDebtPayMut.isPending}
            bankruptPending={bankruptMut.isPending}
            onPay={onStartDebtPay}
            onBankrupt={onBankrupt}
          />
          <TileInfoOverlay
            visible={
              inspectIndex != null &&
              !showBuyModal &&
              !showAuctionModal &&
              !showTradeModal &&
              !showDebtChoice &&
              !economy.mode
            }
            location={inspectLoc}
            owner={inspectOwner}
            onClose={() => setInspectIndex(null)}
          />
          <EconomyModeSheet
            mode={economy.mode}
            visible={economy.sheetOpen}
            centerSide={
              layout
                ? Math.min(layout.center.width, layout.center.height)
                : boardSide * 0.55
            }
            onClose={economy.clearMode}
          />
          <JailActionSheet
            visible={showJailSheet}
            jailTurns={localGamePlayer?.jailTurns ?? 0}
            getOutOfJailFree={localGamePlayer?.getOutOfJailFree ?? 0}
            canPayFine={Boolean(game?.canPayJailFine)}
            canUseCard={Boolean(game?.canUseJailCard)}
            canRollDoubles={Boolean(game?.canRoll)}
            avatarInitials={usernameInitialSafe(
              localGamePlayer?.username ?? username,
            )}
            avatarAccent={displayAccent ?? localGamePlayer?.pinColor ?? colors.accent}
            payPending={payJailMut.isPending}
            cardPending={useJailCardMut.isPending}
            onPayFine={onPayJailFine}
            onUseCard={onUseJailCard}
            onRollDoubles={onJailRollDoubles}
          />
          <EconomyEventOverlay event={economyEvent} />
        </View>

        <View style={[styles.panelRail, { height: boardSide }]}>
          <BoardPanel
            onStick={walk.setStick}
            accent={displayAccent}
            nearby={walk.nearby}
            onEnter={persistAndEnter}
            onMenuPress={() => setMenuOpen(true)}
            game={game}
            locations={locations}
            localUserId={localUserId}
            localUsername={username}
            onRoll={game ? onRoll : undefined}
            rollDisabled={
              !isMyTurn ||
              !game?.canRoll ||
              turnBusy ||
              showJailSheet ||
              showAuctionModal ||
              showTradeModal ||
              showDebtChoice ||
              showDebtPaying
            }
            rollPending={rollDice.isPending}
            onEndTurn={game ? onEndTurn : undefined}
            endDisabled={
              !isMyTurn ||
              !game?.canEndTurn ||
              turnBusy ||
              showBuyModal ||
              showAuctionModal ||
              showTradeModal ||
              showDebtChoice ||
              showDebtPaying
            }
            endPending={endTurnMut.isPending}
            economyMode={economy.mode}
            onEconomySelect={
              showDebtChoice ? undefined : economy.selectMode
            }
            tradeEnabled={tradeEnabled}
            onTrade={onOpenTrade}
            peekActive={showAuctionModal}
            onPeekIn={() => setAuctionPeeking(true)}
            onPeekOut={() => setAuctionPeeking(false)}
          />
        </View>
      </View>

      <InfoModal
        visible={leaveConfirmOpen}
        onClose={() => {
          if (!resignMut.isPending) {
            setLeaveConfirmOpen(false);
          }
        }}
        eyebrow="Leave"
        title="Resign from this game?"
        body="Leaving mid-game counts as resigning. Your deeds return to the Bank and any remaining debt is settled from the Bank."
        actionsLayout="row"
        primaryLabel="Stay"
        onPrimary={() => setLeaveConfirmOpen(false)}
        secondaryLabel="Resign & leave"
        onSecondary={confirmResign}
        secondaryLoading={resignMut.isPending}
      />

      <InfoModal
        visible={winnerOpen}
        onClose={dismissWinner}
        eyebrow="Game over"
        title={
          game?.winnerUserId === localUserId
            ? "You win"
            : `${formatUsername(game?.winnerUsername) || "Someone"} wins`
        }
        body={
          game?.winnerUserId === localUserId
            ? "You are the last player standing."
            : "The game has finished. Back to worlds when you are ready."
        }
        actionsLayout="row"
        primaryLabel="Back to worlds"
        onPrimary={dismissWinner}
        secondaryLabel="Close"
      />

      <BoardOverflowMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onLeave={requestLeave}
        onLogout={() => {
          void logout.mutateAsync();
        }}
        logoutPending={logout.isPending}
        onHealth={
          __DEV__
            ? () => {
                router.push("/(app)/health");
              }
            : undefined
        }
        onLocations={
          __DEV__
            ? () => {
                router.push("/(app)/locations");
              }
            : undefined
        }
      />
    </View>
  );
}

function usernameInitialSafe(username: string | null): string {
  const raw = (username ?? "").trim();
  return raw.length >= 1 ? raw.slice(0, 1).toUpperCase() : "?";
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  main: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
  },
  boardRail: {
    position: "relative",
    flexShrink: 0,
    overflow: "hidden",
    backgroundColor: colors.brandMuted,
  },
  boardState: {
    ...(StyleSheet.absoluteFill as object),
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  boardStateText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onBrand,
  },
  boardStateError: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.danger,
    textAlign: "center",
  },
  panelRail: {
    flex: 1,
    minWidth: PANEL_MIN,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
});
