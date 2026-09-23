import { useEffect, useRef, useState } from 'react';

import type { Game, GameLastRoll, GamePlayer } from '@/api/types';
import type { BoardLayout } from '@/components/board/boardLayout';
import {
  buildGamePins,
  type BoardPinModel,
  type GamePinPlayer,
} from '@/components/board/boardPins';

const BOARD_SPACES = 40;
/** ms between tile hops — ~2s for a typical 7. */
export const PIN_STEP_MS = 320;

function rollKey(roll: GameLastRoll): string {
  return `${roll.userId}:${roll.fromIndex}:${roll.toIndex}:${roll.die1}:${roll.die2}:${roll.total}`;
}

/**
 * Drives game pins: snap on first paint; on new lastRoll, walk the mover tile-by-tile.
 */
export function useGamePinMotion(opts: {
  layout: BoardLayout | null;
  game: Game | null;
  localUserId: string | null;
  pinRadius: number;
}): { pins: BoardPinModel[]; animating: boolean } {
  const { layout, game, localUserId, pinRadius } = opts;
  const [displayPlayers, setDisplayPlayers] = useState<GamePinPlayer[]>([]);
  const [animating, setAnimating] = useState(false);
  const seenRollRef = useRef<string | null>(null);
  const firstSyncRef = useRef(true);
  const animatingRef = useRef(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    cancelRef.current = false;
    return () => {
      cancelRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (!game) {
      setDisplayPlayers([]);
      setAnimating(false);
      animatingRef.current = false;
      firstSyncRef.current = true;
      seenRollRef.current = null;
      return;
    }

    const asPins = (players: GamePlayer[]): GamePinPlayer[] =>
      players.map((p) => ({
        userId: p.userId,
        boardIndex: p.boardIndex,
        pinColor: p.pinColor,
      }));

    const roll = game.lastRoll ?? null;
    const key = roll ? rollKey(roll) : null;

    if (firstSyncRef.current) {
      firstSyncRef.current = false;
      if (key) {
        seenRollRef.current = key;
      }
      setDisplayPlayers(asPins(game.players));
      setAnimating(false);
      animatingRef.current = false;
      return;
    }

    // Same roll (e.g. refetch poll) — do not interrupt an in-flight hop.
    if (!roll || key === seenRollRef.current) {
      if (!animatingRef.current) {
        setDisplayPlayers(asPins(game.players));
      }
      return;
    }

    seenRollRef.current = key;
    const moverId = roll.userId;
    const steps = Math.max(1, Math.min(BOARD_SPACES - 1, roll.total));
    const finalPlayers = asPins(game.players);

    const startPlayers = game.players.map((p) =>
      p.userId === moverId
        ? { userId: p.userId, boardIndex: roll.fromIndex, pinColor: p.pinColor }
        : { userId: p.userId, boardIndex: p.boardIndex, pinColor: p.pinColor },
    );
    setDisplayPlayers(startPlayers);
    setAnimating(true);
    animatingRef.current = true;

    let step = 0;
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (cancelRef.current) {
        return;
      }
      step += 1;
      const idx = (roll.fromIndex + step) % BOARD_SPACES;
      setDisplayPlayers((prev) =>
        prev.map((p) =>
          p.userId === moverId ? { ...p, boardIndex: idx } : p,
        ),
      );
      if (step >= steps) {
        setDisplayPlayers(finalPlayers);
        setAnimating(false);
        animatingRef.current = false;
        return;
      }
      timeout = setTimeout(tick, PIN_STEP_MS);
    };
    timeout = setTimeout(tick, PIN_STEP_MS);
    return () => {
      clearTimeout(timeout);
    };
  }, [game]);

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
