import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GameBuyOffer } from '@/api/types';
import { Joystick } from '@/components/board/Joystick';
import { stripWorldNamePrefix } from '@/components/board/deedVisual';
import { shortTileName } from '@/components/board/tileLabel';
import { tileVisual } from '@/components/board/tileStyle';
import { HubBuySheet } from '@/components/hub/HubBuySheet';
import { HubLocationCopy } from '@/components/hub/HubLocationCopy';
import { HubScene } from '@/components/hub/HubScene';
import { HubTurnSheet } from '@/components/hub/HubTurnSheet';
import { useMe } from '@/hooks/useAuth';
import { useBlockHardwareBack } from '@/hooks/useBlockHardwareBack';
import { useHubPresence } from '@/hooks/useBoardPresence';
import {
  useBuyProperty,
  useEndTurn,
  useGame,
  useLeaveHub,
  useRollDice,
} from '@/hooks/useGame';
import { useHubTurnBusy } from '@/hooks/useHubTurnBusy';
import { useHubWalk } from '@/hooks/useHubWalk';
import { DEFAULT_WORLD_ID, useLocationBySlug } from '@/hooks/useLocations';
import { useSession } from '@/hooks/useSession';
import { usePlayerTimeBanks } from '@/hooks/useTurnCountdown';
import { formatUsername } from '@/lib/formatUsername';
import { abortHubEnter } from '@/lib/hubEnterGuard';
import { accentAgainstFloor } from '@/lib/hubFloorContrast';
import { notify } from '@/lib/notify';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

const JOYSTICK_SIZE = 96;
const DOCK_PAD = 16;
const PANE_FLEX = 1;
const CENTER_EDGE = 2;

/**
 * Phase 9 hub chrome: equal 3-pane shell + floor copy (9.0c).
 * Roster (9.0d) comes next. Keep-awake — board may not cover this route.
 */
export default function HubScreen() {
  useBlockHardwareBack(true);
  useKeepAwake('meetopoly-hub', { suppressDeactivateWarnings: true });
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    slug?: string;
    worldId?: string;
    gameId?: string;
  }>();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const worldId =
    typeof params.worldId === 'string' && params.worldId.length > 0
      ? params.worldId
      : DEFAULT_WORLD_ID;
  const gameId =
    typeof params.gameId === 'string' && params.gameId.trim().length > 0
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
  const bankLabels = usePlayerTimeBanks(game);

  const localUserId = useMemo(() => {
    if (sessionUserId) {
      return sessionUserId;
    }
    if (!game || !username) {
      return null;
    }
    const key = formatUsername(username).toLowerCase();
    return (
      game.players.find(
        (p) => formatUsername(p.username).toLowerCase() === key,
      )?.userId ?? null
    );
  }, [sessionUserId, game, username]);

  const localPlayer = useMemo(
    () => game?.players.find((p) => p.userId === localUserId) ?? null,
    [game?.players, localUserId],
  );

  const [surfaceBox, setSurfaceBox] = useState({ w: 0, h: 0 });
  const [turnSheetOpen, setTurnSheetOpen] = useState(false);
  const [buySheetOpen, setBuySheetOpen] = useState(false);
  const [buySheetOffer, setBuySheetOffer] = useState<GameBuyOffer | null>(
    null,
  );
  const [awaitingEndAfterBuy, setAwaitingEndAfterBuy] = useState(false);
  const buyOfferKeyRef = useRef<string | null>(null);
  const surfaceW = Math.max(0, Math.floor(surfaceBox.w));
  const surfaceH = Math.max(0, Math.floor(surfaceBox.h));
  const surfaceReady = surfaceW > 0 && surfaceH > 0;
  const turnBusy = useHubTurnBusy(game);

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
      return () => {
        if (skipLeaveOnBlurRef.current) {
          skipLeaveOnBlurRef.current = false;
          return;
        }
        if (gameId) {
          abortHubEnter();
          leaveHubRef.current(undefined, {
            onError: (err) => {
              console.warn('[hub] leave-hub failed', err);
            },
          });
        }
      };
    }, [gameId]),
  );

  const isMyTurn = Boolean(
    game &&
      localUserId &&
      game.status === 'active' &&
      game.currentUserId === localUserId &&
      localPlayer &&
      !localPlayer.resigned,
  );
  const inHubMarked = Boolean(localPlayer?.hubId?.trim());

  useEffect(() => {
    if (!isMyTurn || !inHubMarked || !game) {
      return;
    }
    const edge = `${game.currentUserId}:${game.turnStartedAt ?? ''}`;
    if (turnEdgeRef.current === edge) {
      return;
    }
    turnEdgeRef.current = edge;
    setTurnSheetOpen(true);
    notify({
      type: 'info',
      title: 'Your turn',
      message: 'Roll or open the board from the hub',
      visibilityTime: 3200,
    });
  }, [isMyTurn, inHubMarked, game]);

  const getPoseRef = useRef(walk.getPose);
  getPoseRef.current = walk.getPose;
  const sendPoseRef = useRef(presence.sendPose);
  sendPoseRef.current = presence.sendPose;

  useEffect(() => {
    if (!presence.dcOpen || !surfaceReady) {
      return;
    }
    const tick = () => {
      const pose = getPoseRef.current();
      sendPoseRef.current({
        x: pose.x / surfaceW,
        y: pose.y / surfaceH,
      });
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [presence.dcOpen, surfaceReady, surfaceW, surfaceH]);

  const code = location ? shortTileName(location) : '';
  const hubDisplayName = location
    ? stripWorldNamePrefix(location.name)
    : isLoading
      ? '…'
      : slug || 'Hub';
  const tile = tileVisual(location ?? undefined);
  const floorColor = tile.bandColor ?? tile.fill;
  const hubBlurb =
    location?.about?.trim() ||
    location?.aboutShort?.trim() ||
    location?.description?.trim() ||
    '';
  const copyPadTop = 12 + insets.top;
  /** Title (≤2 lines) + code + gaps ≈ 56; keep about inside remaining pane height. */
  const blurbLines = Math.max(
    2,
    Math.floor((Math.max(0, surfaceBox.h) - copyPadTop - 16 - 56) / 18),
  );

  const remotes = useMemo(() => {
    const colorByUser = new Map<string, string>();
    for (const p of game?.players ?? []) {
      if (p.pinColor) {
        colorByUser.set(p.userId, p.pinColor);
      }
    }
    return Object.values(presence.remotes).map((pose) => {
      const preferred = colorByUser.get(pose.userId) ?? colors.muted;
      return {
        pose,
        accent: accentAgainstFloor(preferred, floorColor, pose.userId),
      };
    });
  }, [presence.remotes, game?.players, floorColor]);

  const localAccent = useMemo(() => {
    const preferred = localPlayer?.pinColor?.trim() || walk.accent;
    return accentAgainstFloor(
      preferred,
      floorColor,
      localUserId ?? username ?? 'local',
    );
  }, [localPlayer?.pinColor, walk.accent, floorColor, localUserId, username]);

  const bankLabel = localUserId ? (bankLabels[localUserId] ?? '') : '';
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
        pathname: '/(app)/board',
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

  const openBoard = useCallback(() => {
    skipLeaveOnBlurRef.current = true;
    setTurnSheetOpen(false);
    setBuySheetOpen(false);
    setAwaitingEndAfterBuy(false);
    goBackToBoard();
  }, [goBackToBoard]);

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
          type: 'error',
          title: 'Roll failed',
          message: err.message || 'Could not roll',
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
          type: 'error',
          title: 'End turn failed',
          message: err.message || 'Could not end turn',
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
          type: 'error',
          title: 'Buy failed',
          message: err.message || 'Could not buy',
        });
      },
    });
  }, [gameId, buyMut, turnBusy]);

  const presenceHint =
    presence.status === 'connected' && presence.dcOpen
      ? 'Live'
      : presence.status === 'connecting' || presence.status === 'connected'
        ? 'Connecting…'
        : presence.status === 'error'
          ? 'Hub full or error'
          : '';

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
            { flex: PANE_FLEX, paddingTop: 12 + insets.top },
          ]}
        >
          <Text style={styles.mediaEyebrow}>Media</Text>
          <Text style={styles.mediaStub}>Cameras · Phase 10</Text>
          {presenceHint ? (
            <Text style={styles.mediaStatus}>{presenceHint}</Text>
          ) : null}
          {bankLabel ? (
            <Text style={styles.mediaBank}>Time · {bankLabel}</Text>
          ) : null}
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
              {error instanceof Error ? error.message : 'Failed to load hub'}
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
            paddingTop={copyPadTop}
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
                }}
                remotes={remotes}
                remoteRadius={walk.avatarRadius}
              />
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.panelRail,
            { flex: PANE_FLEX, paddingTop: 10 + insets.top },
          ]}
        >
          <View style={styles.panelHeader}>
            <Text style={styles.panelEyebrow} numberOfLines={1}>
              {hubDisplayName}
              {code ? ` · ${code}` : ''}
            </Text>
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
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>
          <Text style={styles.panelStub}>Roster · Phase 9.0d</Text>

          <View style={styles.joystickDock} pointerEvents="box-none">
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
    flexDirection: 'row',
    minHeight: 0,
  },
  mediaRail: {
    flexShrink: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    gap: 6,
  },
  mediaEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  mediaStub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  mediaStatus: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.brand,
    marginTop: 8,
  },
  mediaBank: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink,
  },
  centerRail: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
    overflow: 'hidden',
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
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingBottom: DOCK_PAD + JOYSTICK_SIZE + 8,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  panelEyebrow: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  panelStub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 8,
  },
  joystickDock: {
    position: 'absolute',
    right: DOCK_PAD,
    bottom: DOCK_PAD,
    zIndex: 30,
  },
});
