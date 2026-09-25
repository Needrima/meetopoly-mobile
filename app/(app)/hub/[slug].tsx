import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GameBuyOffer } from '@/api/types';
import { Joystick } from '@/components/board/Joystick';
import { stripWorldNamePrefix } from '@/components/board/deedVisual';
import { shortTileName } from '@/components/board/tileLabel';
import { HubBuySheet } from '@/components/hub/HubBuySheet';
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
import { notify } from '@/lib/notify';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

const JOYSTICK_SIZE = 96;
const DOCK_PAD = 20;
const HEADER_H = 52;

/**
 * Phase 8.1–8.3 hub: poses + turn sheet; X Leave clears hubId; Open board keeps it.
 */
export default function HubScreen() {
  useBlockHardwareBack(true);
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
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

  const { data: location, isLoading, isError, error } = useLocationBySlug(
    worldId,
    slug,
  );

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
  const surfaceSize = Math.max(
    0,
    Math.floor(Math.min(surfaceBox.w, surfaceBox.h)),
  );
  const turnBusy = useHubTurnBusy(game);

  const walk = useHubWalk({
    size: surfaceSize,
    username,
    enabled: surfaceSize > 0,
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
    if (!presence.dcOpen || surfaceSize <= 0) {
      return;
    }
    const tick = () => {
      const pose = getPoseRef.current();
      sendPoseRef.current({
        x: pose.x / surfaceSize,
        y: pose.y / surfaceSize,
      });
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [presence.dcOpen, surfaceSize]);

  const remotes = useMemo(() => {
    const colorByUser = new Map<string, string>();
    for (const p of game?.players ?? []) {
      if (p.pinColor) {
        colorByUser.set(p.userId, p.pinColor);
      }
    }
    return Object.values(presence.remotes).map((pose) => ({
      pose,
      accent: colorByUser.get(pose.userId) ?? colors.muted,
    }));
  }, [presence.remotes, game?.players]);

  const code = location ? shortTileName(location) : '';
  const hubDisplayName = location
    ? stripWorldNamePrefix(location.name)
    : isLoading
      ? '…'
      : slug || 'Hub';
  const bankLabel = localUserId ? bankLabels[localUserId] ?? '' : '';
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

  const maxScene = Math.min(winW - insets.left - insets.right - 32, winH * 0.62);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
          paddingLeft: insets.left + 16,
          paddingRight: insets.right + 16,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Hub{code ? ` · ${code}` : ''}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {hubDisplayName}
          </Text>
          {bankLabel ? (
            <Text style={styles.bankHeader}>Time · {bankLabel}</Text>
          ) : null}
          {presenceHint ? (
            <Text style={styles.presence}>{presenceHint}</Text>
          ) : null}
        </View>
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
          <Ionicons name="close" size={26} color={colors.ink} />
        </Pressable>
      </View>

      {isError ? (
        <Text style={styles.error}>
          {error instanceof Error ? error.message : 'Failed to load hub'}
        </Text>
      ) : null}

      {isLoading && !location ? (
        <ActivityIndicator color={colors.brand} style={styles.spinner} />
      ) : null}

      <View
        style={[styles.stage, { maxHeight: maxScene }]}
        onLayout={onSurfaceLayout}
      >
        <View style={styles.stageInner}>
          {surfaceSize > 0 ? (
            <HubScene
              size={surfaceSize}
              local={{
                poseX: walk.poseX,
                poseY: walk.poseY,
                radius: walk.avatarRadius,
                initials: walk.initials,
                accent: walk.accent,
              }}
              remotes={remotes}
              remoteRadius={walk.avatarRadius}
            />
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.stickDock,
          { right: DOCK_PAD, bottom: DOCK_PAD + insets.bottom },
        ]}
        pointerEvents="box-none"
      >
        <Joystick
          onStick={walk.setStick}
          size={JOYSTICK_SIZE}
          accent={walk.accent}
        />
      </View>

      <HubTurnSheet
        visible={
          turnSheetOpen && isMyTurn && inHubMarked && !showBuySheet
        }
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
  header: {
    minHeight: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.brand,
  },
  bankHeader: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
    marginTop: 2,
  },
  presence: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.brand,
    marginTop: 2,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  spinner: {
    marginTop: 12,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.danger,
    marginBottom: 8,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  stageInner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickDock: {
    position: 'absolute',
    zIndex: 30,
  },
});
