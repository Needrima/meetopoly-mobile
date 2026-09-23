import { useLayoutEffect, useRef, useState } from 'react';

import type { Game, GameLastRoll } from '@/api/types';
import { gameRollKey } from '@/hooks/gameRollKey';

/** How long the tumble runs before faces settle (~1.1s). */
export const DICE_ROLL_MS = 1100;

export type DiceOverlayState = {
  die1: number;
  die2: number;
  key: string;
  username: string;
  isDoubles: boolean;
};

type DiceTimers = {
  key: string;
  settle: ReturnType<typeof setTimeout>;
  hide: ReturnType<typeof setTimeout>;
};

/**
 * Plays a local dice tumble whenever `lastRoll` changes (all devices via game WS).
 * Skips a historical roll only when the first snapshot already includes lastRoll.
 * Mutation + WS double updates must not cancel an in-flight tumble.
 */
export function useDiceRollMotion(game: Game | null): {
  animating: boolean;
  overlay: DiceOverlayState | null;
} {
  const [overlay, setOverlay] = useState<DiceOverlayState | null>(null);
  const [animating, setAnimating] = useState(false);
  const seenRef = useRef<string | null>(null);
  const firstSyncRef = useRef(true);
  const timersRef = useRef<DiceTimers | null>(null);

  const clearTimers = () => {
    if (!timersRef.current) {
      return;
    }
    clearTimeout(timersRef.current.settle);
    clearTimeout(timersRef.current.hide);
    timersRef.current = null;
  };

  useLayoutEffect(() => {
    return () => {
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount only
  }, []);

  useLayoutEffect(() => {
    if (!game) {
      firstSyncRef.current = true;
      seenRef.current = null;
      clearTimers();
      setOverlay(null);
      setAnimating(false);
      return;
    }

    const roll: GameLastRoll | null = game.lastRoll ?? null;

    // Fresh game with no roll yet — next roll must animate (do not stay in firstSync).
    if (!roll) {
      if (firstSyncRef.current) {
        firstSyncRef.current = false;
        seenRef.current = null;
      }
      return;
    }

    const key = gameRollKey(roll);

    if (firstSyncRef.current) {
      firstSyncRef.current = false;
      seenRef.current = key;
      return;
    }

    // Same roll identity (WS echo / setQueryData) — keep tumble timers running.
    if (key === seenRef.current) {
      return;
    }

    clearTimers();
    seenRef.current = key;
    setOverlay({
      die1: roll.die1,
      die2: roll.die2,
      key,
      username: roll.username,
      isDoubles: roll.isDoubles,
    });
    setAnimating(true);

    const settle = setTimeout(() => {
      setAnimating(false);
    }, DICE_ROLL_MS);
    const hide = setTimeout(() => {
      setOverlay((prev) => (prev?.key === key ? null : prev));
      if (timersRef.current?.key === key) {
        timersRef.current = null;
      }
    }, DICE_ROLL_MS + 280);

    timersRef.current = { key, settle, hide };
    // No cleanup here — clearing on every `game` identity change was cancelling the tumble.
  }, [game]);

  return { animating, overlay };
}
