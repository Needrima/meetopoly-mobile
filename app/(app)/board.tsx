import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Location } from '@/api/types';
import { Board } from '@/components/board/Board';
import { BoardOverflowMenu } from '@/components/board/BoardOverflowMenu';
import { BoardPanel } from '@/components/board/BoardPanel';
import { BuyPropertyOverlay } from '@/components/board/BuyPropertyOverlay';
import { TileInfoOverlay } from '@/components/board/TileInfoOverlay';
import { layoutBoardRing } from '@/components/board/boardLayout';
import { DiceRollOverlay } from '@/components/board/DiceRollOverlay';
import { InfoModal } from '@/components/ui/InfoModal';
import { useLogout, useMe } from '@/hooks/useAuth';
import { useBlockHardwareBack } from '@/hooks/useBlockHardwareBack';
import { useBoardSession } from '@/hooks/useBoardSession';
import {
  useBoardWalk,
  type AvatarColorKey,
} from '@/hooks/useBoardWalk';
import { useDiceRollMotion } from '@/hooks/useDiceRollMotion';
import {
  useGame,
  useBuyProperty,
  useEndTurn,
  useEnterHub,
  useResignGame,
  useRollDice,
} from '@/hooks/useGame';
import { useBoardPresence } from '@/hooks/useBoardPresence';
import { useGamePinMotion } from '@/hooks/useGamePinMotion';
import { DEFAULT_WORLD_ID, useLocations } from '@/hooks/useLocations';
import { useSession } from '@/hooks/useSession';
import { notify } from '@/lib/notify';
import { formatUsername } from '@/lib/formatUsername';
import { beginHubEnter } from '@/lib/hubEnterGuard';
import { buyToastTitle, countOwnedOfKind } from '@/lib/buyToast';
import { buildBoardRemoteAvatars } from '@/lib/buildBoardRemoteAvatars';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

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
  useKeepAwake('meetopoly-board', { suppressDeactivateWarnings: true });
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ worldId?: string; gameId?: string }>();
  const worldId =
    typeof params.worldId === 'string' && params.worldId.trim().length > 0
      ? params.worldId.trim()
      : DEFAULT_WORLD_ID;
  const gameId =
    typeof params.gameId === 'string' && params.gameId.trim().length > 0
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
  useFocusEffect(
    useCallback(() => {
      setBoardPresenceOn(true);
      return () => setBoardPresenceOn(false);
    }, []),
  );
  const presence = useBoardPresence(gameId, boardPresenceOn);
  const rollDice = useRollDice(gameId);
  const endTurnMut = useEndTurn(gameId);
  const buyMut = useBuyProperty(gameId);
  const resignMut = useResignGame(gameId);
  const enterHubMut = useEnterHub(gameId);
  const game = gameQuery.data ?? null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [inspectIndex, setInspectIndex] = useState<number | null>(null);
  const startedToastRef = useRef(false);
  const passGoToastRef = useRef<string | null>(null);
  const passGoReadyRef = useRef(false);
  const finishedHandledRef = useRef(false);
  const resignToastRef = useRef<string>('');
  const localLeavingRef = useRef(false);
  const deedsSigRef = useRef<string | null>(null);
  const paymentSigRef = useRef<string | null>(null);

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
      game.players.find(
        (p) => formatUsername(p.username).toLowerCase() === key,
      )?.userId ?? null
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
      game.players.find(
        (p) => formatUsername(p.username).toLowerCase() === key,
      )?.pinColor ?? null
    );
  }, [game, localUserId, username]);

  useBlockHardwareBack(true);

  useEffect(() => {
    if (!game || startedToastRef.current) {
      return;
    }
    startedToastRef.current = true;
    // Seed deed signature so reconnect / first paint does not toast history.
    deedsSigRef.current = (game.deeds ?? [])
      .map((d) => `${d.boardIndex}:${d.ownerUserId}`)
      .sort()
      .join('|');
    if (game.lastPayment) {
      const p = game.lastPayment;
      paymentSigRef.current = `${p.kind}:${p.fromUserId}:${p.toUserId ?? ''}:${p.amount}:${p.boardIndex}:${p.paidInFull}`;
    }
    // Ignore historical lastRoll pass-GO from a prior session fetch.
    if (game.lastRoll?.passedGo) {
      passGoToastRef.current = `${game.lastRoll.userId}:${game.lastRoll.fromIndex}:${game.lastRoll.toIndex}:${game.lastRoll.total}`;
    }
    passGoReadyRef.current = true;
    if (game.status === 'finished') {
      finishedHandledRef.current = true;
      setWinnerOpen(true);
      return;
    }
    notify({
      type: 'success',
      title: 'Game started',
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

  const pinRadius = layout
    ? Math.max(6, Math.round(layout.size * 0.018))
    : 8;
  const { rolling: diceRolling, holdPinWalk, overlay: diceOverlay } =
    useDiceRollMotion(game);
  const { pins: motionPins, animating: pinAnimating } = useGamePinMotion({
    layout,
    game,
    localUserId,
    pinRadius,
    holdWalk: holdPinWalk,
    localAccent: displayAccent,
  });
  const turnBusy = holdPinWalk || pinAnimating;

  // Pass-GO toast after pin finishes walking (not when WS arrives).
  useEffect(() => {
    if (!passGoReadyRef.current || turnBusy) {
      return;
    }
    const roll = game?.lastRoll;
    if (!roll?.passedGo || roll.passGoAmount <= 0) {
      return;
    }
    const key = `${roll.userId}:${roll.fromIndex}:${roll.toIndex}:${roll.total}`;
    if (passGoToastRef.current === key) {
      return;
    }
    passGoToastRef.current = key;
    notify({
      type: 'success',
      title: 'Passed GO',
      message: `${formatUsername(roll.username)} +${roll.passGoAmount} MeetCoin`,
    });
  }, [game?.lastRoll, turnBusy]);

  // Phase 6.2c — resign + finished via game WS.
  useEffect(() => {
    if (!game || !localUserId) {
      return;
    }
    const resignedSig = game.players
      .filter((p) => p.resigned)
      .map((p) => p.userId)
      .sort()
      .join(',');
    if (resignedSig && resignedSig !== resignToastRef.current) {
      const prev = new Set(
        resignToastRef.current ? resignToastRef.current.split(',') : [],
      );
      const newlyOut = game.players.filter(
        (p) => p.resigned && !prev.has(p.userId),
      );
      resignToastRef.current = resignedSig;
      for (const p of newlyOut) {
        presence.clearRemote?.(p.userId);
        if (p.userId === localUserId || localLeavingRef.current) {
          continue;
        }
        notify({
          type: 'info',
          title: 'Player left',
          message: `${formatUsername(p.username)} resigned`,
        });
      }
    }
    if (game.status === 'finished' && !finishedHandledRef.current) {
      finishedHandledRef.current = true;
      setLeaveConfirmOpen(false);
      setWinnerOpen(true);
      const iWon = game.winnerUserId === localUserId;
      notify({
        type: 'success',
        title: iWon ? 'You win' : 'Game over',
        message: iWon
          ? 'Last player standing'
          : `${formatUsername(game.winnerUsername) || 'Someone'} wins`,
      });
    }
  }, [game, localUserId, presence.clearRemote]);

  // Phase 6.4 — toast everyone when a deed is added (WS).
  useEffect(() => {
    if (!game || !startedToastRef.current) {
      return;
    }
    const deeds = game.deeds ?? [];
    const sig = deeds
      .map((d) => `${d.boardIndex}:${d.ownerUserId}`)
      .sort()
      .join('|');
    if (deedsSigRef.current === null) {
      deedsSigRef.current = sig;
      return;
    }
    if (sig === deedsSigRef.current) {
      return;
    }
    const prev = new Set(
      deedsSigRef.current
        ? deedsSigRef.current.split('|').filter(Boolean)
        : [],
    );
    deedsSigRef.current = sig;
    for (const d of deeds) {
      const key = `${d.boardIndex}:${d.ownerUserId}`;
      if (prev.has(key)) {
        continue;
      }
      const loc = locations.find((l) => l.boardIndex === d.boardIndex);
      const place = loc?.name ?? `space ${d.boardIndex}`;
      const iBought = Boolean(localUserId && d.ownerUserId === localUserId);
      const ownedOfKind = countOwnedOfKind(
        deeds,
        locations,
        d.ownerUserId,
        loc?.kind,
      );
      notify({
        type: 'success',
        title: buyToastTitle({
          kind: loc?.kind,
          iBought,
          ownerUsername: d.ownerUsername,
          ownedOfKind,
        }),
        message: place,
      });
    }
  }, [game, localUserId, locations]);

  // Phase 6.5 — rent/tax toast after pin settles.
  useEffect(() => {
    if (!game || !startedToastRef.current || turnBusy) {
      return;
    }
    const p = game.lastPayment;
    if (!p) {
      return;
    }
    const sig = `${p.kind}:${p.fromUserId}:${p.toUserId ?? ''}:${p.amount}:${p.boardIndex}:${p.paidInFull}`;
    if (paymentSigRef.current === null) {
      paymentSigRef.current = sig;
      return;
    }
    if (sig === paymentSigRef.current) {
      return;
    }
    paymentSigRef.current = sig;
    const place = p.spaceName || `space ${p.boardIndex}`;
    const iPaid = Boolean(localUserId && p.fromUserId === localUserId);
    const received = Boolean(localUserId && p.toUserId === localUserId);
    if (p.kind === 'tax') {
      notify({
        type: iPaid && !p.paidInFull ? 'error' : 'info',
        title: iPaid ? 'Tax paid' : 'Tax collected',
        message: iPaid
          ? `−${p.amount} MeetCoin · ${place}`
          : `${formatUsername(p.fromUsername)} paid ${p.amount} tax at ${place}`,
      });
    } else {
      notify({
        type: iPaid && !p.paidInFull ? 'error' : 'success',
        title: iPaid
          ? 'Rent paid'
          : received
            ? 'Rent collected'
            : 'Rent paid',
        message: iPaid
          ? `−${p.amount} to ${formatUsername(p.toUsername) || 'owner'} · ${place}`
          : received
            ? `+${p.amount} from ${formatUsername(p.fromUsername)} · ${place}`
            : `${formatUsername(p.fromUsername)} → ${formatUsername(p.toUsername) || 'owner'} · ${p.amount} · ${place}`,
      });
    }
    if (iPaid && !p.paidInFull) {
      notify({
        type: 'error',
        title: 'Cannot afford full amount',
        message:
          'End and Roll are blocked. Resign to leave (bankruptcy rules come later).',
      });
    }
  }, [game, localUserId, turnBusy]);

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
              if (err?.name === 'AbortError') {
                return;
              }
              console.warn('[hub] enter-hub failed', err);
            },
          },
        );
      }
      router.push({
        pathname: '/(app)/hub/[slug]',
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
    router.replace('/(app)/worlds');
  }, [presence.disconnect]);

  const requestLeave = useCallback(() => {
    setMenuOpen(false);
    if (gameId && game && game.status === 'active') {
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
        if (next.status === 'finished') {
          finishedHandledRef.current = true;
          setWinnerOpen(true);
          notify({
            type: 'info',
            title: 'Game over',
            message: `${formatUsername(next.winnerUsername) || 'Someone'} wins`,
          });
          return;
        }
        notify({
          type: 'info',
          title: 'You resigned',
          message: 'Left the game',
        });
        leaveBoard();
      },
      onError: (err: Error) => {
        localLeavingRef.current = false;
        notify({
          type: 'error',
          title: 'Could not leave',
          message: err.message || 'Resign failed',
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
      onError: (err: Error) => {
        notify({
          type: 'error',
          title: 'Buy failed',
          message: err.message || 'Could not buy',
        });
      },
    });
  }, [gameId, buyMut, turnBusy]);

  const boardPins = game ? motionPins : walk.pins;
  const isMyTurn = Boolean(
    game && localUserId && game.currentUserId === localUserId,
  );
  const buyOffer = game?.buyOffer ?? null;
  const showBuyModal = Boolean(
    buyOffer &&
      isMyTurn &&
      game?.status === 'active' &&
      game.canBuy &&
      !turnBusy,
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
        const color =
          isLocal && displayAccent ? displayAccent : p.pinColor;
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
      ? locations.find((l) => l.boardIndex === inspectIndex) ?? null
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
      username: formatUsername(
        deed.ownerUsername || player?.username || 'Player',
      ),
      pinColor:
        isLocalOwner && displayAccent
          ? displayAccent
          : player?.pinColor ?? colors.muted,
    };
  }, [game, inspectIndex, localUserId, displayAccent]);

  const onTilePress = useCallback(
    (boardIndex: number) => {
      if (showBuyModal) {
        return;
      }
      setInspectIndex(boardIndex);
    },
    [showBuyModal],
  );

  const buyLoc = buyOffer
    ? locations.find((l) => l.boardIndex === buyOffer.boardIndex) ?? null
    : null;
  const localCash =
    game?.players.find((p) => p.userId === localUserId)?.cash ?? 0;
  const canAffordBuy = Boolean(
    buyOffer && localCash >= buyOffer.price,
  );

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
                Loading {gameId ? 'game' : worldId}…
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
                    : 'Failed to load board'}
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
              highlightedBoardIndex={walk.nearby?.boardIndex ?? null}
              ownerColorByIndex={ownerColorByIndex}
              onTilePress={showBuyModal ? undefined : onTilePress}
              avatar={{
                poseX: walk.poseX,
                poseY: walk.poseY,
                radius: walk.avatarRadius,
                initials: walk.initials,
                accent: displayAccent,
              }}
              remotes={remoteAvatars}
              pins={boardPins}
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
              buyPending={buyMut.isPending}
              onBuy={onBuy}
            />
          ) : null}
          <TileInfoOverlay
            visible={inspectIndex != null && !showBuyModal}
            location={inspectLoc}
            owner={inspectOwner}
            onClose={() => setInspectIndex(null)}
          />
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
            rollDisabled={!isMyTurn || !game?.canRoll || turnBusy}
            rollPending={rollDice.isPending}
            onEndTurn={game ? onEndTurn : undefined}
            endDisabled={!isMyTurn || !game?.canEndTurn || turnBusy}
            endPending={endTurnMut.isPending}
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
        body="Leaving mid-game counts as resigning. You will be skipped for turns; assets stay frozen until bankruptcy rules land."
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
            ? 'You win'
            : `${formatUsername(game?.winnerUsername) || 'Someone'} wins`
        }
        body={
          game?.winnerUserId === localUserId
            ? 'You are the last player standing.'
            : 'The game has finished. Back to worlds when you are ready.'
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
                router.push('/(app)/health');
              }
            : undefined
        }
        onLocations={
          __DEV__
            ? () => {
                router.push('/(app)/locations');
              }
            : undefined
        }
      />
    </View>
  );
}

function usernameInitialSafe(username: string | null): string {
  const raw = (username ?? '').trim();
  return raw.length >= 1 ? raw.slice(0, 1).toUpperCase() : '?';
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  boardRail: {
    position: 'relative',
    flexShrink: 0,
    overflow: 'hidden',
    backgroundColor: colors.brandMuted,
  },
  boardState: {
    ...(StyleSheet.absoluteFill as object),
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
  },
  panelRail: {
    flex: 1,
    minWidth: PANEL_MIN,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
});
