import { useLayoutEffect, useRef, useState } from 'react';

import type { Game, GameLastRoll } from '@/api/types';
import { gameRollKey } from '@/hooks/gameRollKey';

/** Tumble duration before faces settle. */
export const DICE_TUMBLE_MS = 1100;
/** Pause after settle so players can read the faces. */
export const DICE_HOLD_MS = 2000;
/** Fade/remove overlay after hold (pin walk starts when holdPinWalk clears). */
export const DICE_FADE_MS = 200;

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
  release: ReturnType<typeof setTimeout>;
  hide: ReturnType<typeof setTimeout>;
};

/**
 * Plays a local dice tumble whenever `lastRoll` changes (all devices via game WS).
 * Sequence: tumble → show faces (hold) → close modal → release pin walk.
 */
export function useDiceRollMotion(game: Game | null): {
  /** True while dice are spinning (not during the read-hold). */
  rolling: boolean;
  /** True until overlay sequence finishes — gate pin walk on this. */
  holdPinWalk: boolean;
  overlay: DiceOverlayState | null;
} {
  const [overlay, setOverlay] = useState<DiceOverlayState | null>(null);
  const [rolling, setRolling] = useState(false);
  const [holdPinWalk, setHoldPinWalk] = useState(false);
  const seenRef = useRef<string | null>(null);
  const firstSyncRef = useRef(true);
  const timersRef = useRef<DiceTimers | null>(null);

  const clearTimers = () => {
    if (!timersRef.current) {
      return;
    }
    clearTimeout(timersRef.current.settle);
    clearTimeout(timersRef.current.release);
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
      setRolling(false);
      setHoldPinWalk(false);
      return;
    }

    const roll: GameLastRoll | null = game.lastRoll ?? null;

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
    setRolling(true);
    setHoldPinWalk(true);

    const settle = setTimeout(() => {
      setRolling(false);
    }, DICE_TUMBLE_MS);

    // Keep final faces visible, then close overlay, then release pin walk.
    const hide = setTimeout(() => {
      setOverlay((prev) => (prev?.key === key ? null : prev));
    }, DICE_TUMBLE_MS + DICE_HOLD_MS);

    const release = setTimeout(() => {
      setHoldPinWalk(false);
      if (timersRef.current?.key === key) {
        timersRef.current = null;
      }
    }, DICE_TUMBLE_MS + DICE_HOLD_MS + DICE_FADE_MS);

    timersRef.current = { key, settle, release, hide };
  }, [game]);

  return { rolling, holdPinWalk, overlay };
}

/** @deprecated use DICE_TUMBLE_MS */
export const DICE_ROLL_MS = DICE_TUMBLE_MS;
