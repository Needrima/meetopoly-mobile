import { useEffect, useRef, useState } from 'react';

import type { Game, GameLastRoll, GamePlayer } from '@/api/types';
import type { BoardLayout } from '@/components/board/boardLayout';
import {
  buildGamePins,
  type BoardPinModel,
  type GamePinPlayer,
} from '@/components/board/boardPins';
import { gameRollKey } from '@/hooks/gameRollKey';

const BOARD_SPACES = 40;
/** ms between tile hops — ~2s for a typical 7. */
export const PIN_STEP_MS = 320;

type PendingWalk = {
  key: string;
  roll: GameLastRoll;
  startPlayers: GamePinPlayer[];
  finalPlayers: GamePinPlayer[];
};

type WalkTimers = {
  key: string;
  timeout: ReturnType<typeof setTimeout> | null;
};

function asPins(
  players: GamePlayer[],
  localUserId: string | null,
  localAccent: string | null,
): GamePinPlayer[] {
  return players.map((p) => ({
    userId: p.userId,
    boardIndex: p.boardIndex,
    pinColor:
      localUserId && p.userId === localUserId && localAccent
        ? localAccent
        : p.pinColor,
  }));
}

function buildPending(
  roll: GameLastRoll,
  players: GamePlayer[],
  localUserId: string | null,
  localAccent: string | null,
): PendingWalk {
  const moverId = roll.userId;
  const colored = asPins(players, localUserId, localAccent);
  return {
    key: gameRollKey(roll),
    roll,
    finalPlayers: colored,
    startPlayers: colored.map((p) =>
      p.userId === moverId ? { ...p, boardIndex: roll.fromIndex } : p,
    ),
  };
}

/**
 * Drives game pins: snap on first paint; on new lastRoll, walk the mover tile-by-tile.
 * When `holdWalk` is true (dice tumbling), parks the pin at `fromIndex` until hold clears.
 */
export function useGamePinMotion(opts: {
  layout: BoardLayout | null;
  game: Game | null;
  localUserId: string | null;
  pinRadius: number;
  /** Phase 6.2b — wait for dice before tile-walk. */
  holdWalk?: boolean;
  /** Prefer local avatar accent for the local player's pin. */
  localAccent?: string | null;
}): { pins: BoardPinModel[]; animating: boolean } {
  const {
    layout,
    game,
    localUserId,
    pinRadius,
    holdWalk = false,
    localAccent = null,
  } = opts;

  const [displayPlayers, setDisplayPlayers] = useState<GamePinPlayer[]>([]);
  const [animating, setAnimating] = useState(false);
  const seenRollRef = useRef<string | null>(null);
  const firstSyncRef = useRef(true);
  const animatingRef = useRef(false);
  const pendingRef = useRef<PendingWalk | null>(null);
  const walkRef = useRef<WalkTimers | null>(null);
  const cancelledRef = useRef(false);

  const clearWalkTimer = () => {
    if (walkRef.current?.timeout != null) {
      clearTimeout(walkRef.current.timeout);
      walkRef.current.timeout = null;
    }
  };

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      clearWalkTimer();
      walkRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!game) {
      clearWalkTimer();
      walkRef.current = null;
      setDisplayPlayers([]);
      setAnimating(false);
      animatingRef.current = false;
      firstSyncRef.current = true;
      seenRollRef.current = null;
      pendingRef.current = null;
      return;
    }

    const roll = game.lastRoll ?? null;
    const key = roll ? gameRollKey(roll) : null;

    const startWalk = (pending: PendingWalk) => {
      const { roll: r, startPlayers, finalPlayers } = pending;
      const moverId = r.userId;
      const delta =
        (r.toIndex - r.fromIndex + BOARD_SPACES) % BOARD_SPACES;
      const steps =
        r.thirdDoubles || delta === 0
          ? 0
          : Math.max(1, Math.min(BOARD_SPACES - 1, delta));

      // Already walking this roll (game identity churn) — do not restart.
      if (walkRef.current?.key === pending.key && animatingRef.current) {
        return;
      }

      clearWalkTimer();
      seenRollRef.current = pending.key;
      pendingRef.current = null;

      if (steps === 0) {
        setDisplayPlayers(finalPlayers);
        setAnimating(false);
        animatingRef.current = false;
        walkRef.current = null;
        return;
      }

      setDisplayPlayers(startPlayers);
      setAnimating(true);
      animatingRef.current = true;
      walkRef.current = { key: pending.key, timeout: null };

      let step = 0;
      const tick = () => {
        if (cancelledRef.current || walkRef.current?.key !== pending.key) {
          return;
        }
        step += 1;
        const idx = (r.fromIndex + step) % BOARD_SPACES;
        setDisplayPlayers((prev) =>
          prev.map((p) =>
            p.userId === moverId ? { ...p, boardIndex: idx } : p,
          ),
        );
        if (step >= steps) {
          setDisplayPlayers(finalPlayers);
          setAnimating(false);
          animatingRef.current = false;
          walkRef.current = null;
          return;
        }
        if (walkRef.current) {
          walkRef.current.timeout = setTimeout(tick, PIN_STEP_MS);
        }
      };
      if (walkRef.current) {
        walkRef.current.timeout = setTimeout(tick, PIN_STEP_MS);
      }
    };

    if (!roll) {
      if (firstSyncRef.current) {
        firstSyncRef.current = false;
        seenRollRef.current = null;
      }
      if (!animatingRef.current) {
        setDisplayPlayers(asPins(game.players, localUserId, localAccent));
      }
      return;
    }

    if (firstSyncRef.current) {
      firstSyncRef.current = false;
      seenRollRef.current = key;
      setDisplayPlayers(asPins(game.players, localUserId, localAccent));
      setAnimating(false);
      animatingRef.current = false;
      return;
    }

    // Hold cleared — start a deferred walk.
    // animating may already be true from the park (buy-modal flash guard).
    if (
      !holdWalk &&
      pendingRef.current &&
      pendingRef.current.key !== seenRollRef.current
    ) {
      startWalk(pendingRef.current);
      return;
    }

    // Same roll (WS echo) — do not interrupt an in-flight hop or pending park.
    if (
      key != null &&
      (key === seenRollRef.current || key === pendingRef.current?.key)
    ) {
      if (
        pendingRef.current &&
        key === pendingRef.current.key &&
        !animatingRef.current
      ) {
        return;
      }
      if (!animatingRef.current && !pendingRef.current) {
        setDisplayPlayers(asPins(game.players, localUserId, localAccent));
      }
      return;
    }

    // New roll — always park; never startWalk here (holdWalk may still be false
    // on the first frame before dice motion claims the hold).
    if (!roll || !key) {
      return;
    }
    const pending = buildPending(roll, game.players, localUserId, localAccent);
    pendingRef.current = pending;
    setDisplayPlayers(pending.startPlayers);

    const delta =
      (roll.toIndex - roll.fromIndex + BOARD_SPACES) % BOARD_SPACES;
    const steps =
      roll.thirdDoubles || delta === 0
        ? 0
        : Math.max(1, Math.min(BOARD_SPACES - 1, delta));
    // Busy from roll arrival until walk finishes — closes buy-modal flash gap
    // between dice hold release and startWalk.
    if (steps > 0) {
      setAnimating(true);
      animatingRef.current = true;
    }

    if (!holdWalk) {
      // Dice will flip hold on next commit; walk starts when hold clears.
      return;
    }
  }, [game, holdWalk, localUserId, localAccent]);

  if (!layout || !displayPlayers.length) {
    return { pins: [], animating };
  }

  return {
    pins: buildGamePins({
      layout,
      players: displayPlayers,
      localUserId,
      pinRadius,
    }),
    animating,
  };
}
