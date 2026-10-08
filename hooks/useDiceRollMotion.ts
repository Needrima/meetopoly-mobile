import { useLayoutEffect, useRef, useState } from 'react';

import type { Game, GameLastRoll } from '@/api/types';
import { gameRollKey } from '@/hooks/gameRollKey';

/** Tumble duration before faces settle. */
export const DICE_TUMBLE_MS = 1100;
/** Pause after settle so players can read the faces. */
export const DICE_HOLD_MS = 2000;
/** Fade/remove overlay after hold (pin walk starts when holdPinWalk clears). */
export const DICE_FADE_MS = 200;

/** Full roller dice theater — spectators wait this long (no overlay) then toast + pin. */
export const DICE_REVEAL_MS = DICE_TUMBLE_MS + DICE_HOLD_MS + DICE_FADE_MS;

export type DiceOverlayState = {
  die1: number;
  die2: number;
  key: string;
  username: string;
  isDoubles: boolean;
};

type DiceTimers = {
  key: string;
  settle: ReturnType<typeof setTimeout> | null;
  release: ReturnType<typeof setTimeout>;
  hide: ReturnType<typeof setTimeout> | null;
};

export type UseDiceRollMotionOpts = {
  localUserId?: string | null;
  /**
   * Fired when the spectator reveal window ends (same moment pin walk starts).
   * Not called for the roller.
   */
  onSpectatorRoll?: (roll: GameLastRoll) => void;
};

/**
 * Phase 22.1 — synced reveal:
 * - Roller: overlay tumble → hold faces → release pin walk.
 * - Spectator: silent wait for the same duration → toast + pin walk (no Moti dice).
 * `lastRoll` still arrives for all clients via game WS immediately.
 */
export function useDiceRollMotion(
  game: Game | null,
  opts?: UseDiceRollMotionOpts,
): {
  /** True while dice are spinning (roller overlay only). */
  rolling: boolean;
  /** True until reveal window finishes — gates pin walk for roller and spectators. */
  holdPinWalk: boolean;
  overlay: DiceOverlayState | null;
} {
  const localUserId = opts?.localUserId ?? null;
  const onSpectatorRollRef = useRef(opts?.onSpectatorRoll);
  onSpectatorRollRef.current = opts?.onSpectatorRoll;
  const [overlay, setOverlay] = useState<DiceOverlayState | null>(null);
  const [rolling, setRolling] = useState(false);
  const [holding, setHolding] = useState(false);
  const seenRef = useRef<string | null>(null);
  const firstSyncRef = useRef(true);
  const timersRef = useRef<DiceTimers | null>(null);

  const clearTimers = () => {
    if (!timersRef.current) {
      return;
    }
    if (timersRef.current.settle != null) {
      clearTimeout(timersRef.current.settle);
    }
    clearTimeout(timersRef.current.release);
    if (timersRef.current.hide != null) {
      clearTimeout(timersRef.current.hide);
    }
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
      setHolding(false);
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

    const isRoller = Boolean(localUserId && roll.userId === localUserId);

    if (!isRoller) {
      // Silent wait matching roller theater, then toast + release pin walk.
      setOverlay(null);
      setRolling(false);
      setHolding(true);

      const release = setTimeout(() => {
        setHolding(false);
        onSpectatorRollRef.current?.(roll);
        if (timersRef.current?.key === key) {
          timersRef.current = null;
        }
      }, DICE_REVEAL_MS);

      timersRef.current = { key, settle: null, release, hide: null };
      return;
    }

    setOverlay({
      die1: roll.die1,
      die2: roll.die2,
      key,
      username: roll.username,
      isDoubles: roll.isDoubles,
    });
    setRolling(true);
    setHolding(true);

    const settle = setTimeout(() => {
      setRolling(false);
    }, DICE_TUMBLE_MS);

    const hide = setTimeout(() => {
      setOverlay((prev) => (prev?.key === key ? null : prev));
    }, DICE_TUMBLE_MS + DICE_HOLD_MS);

    const release = setTimeout(() => {
      setHolding(false);
      if (timersRef.current?.key === key) {
        timersRef.current = null;
      }
    }, DICE_REVEAL_MS);

    timersRef.current = { key, settle, release, hide };
  }, [game, localUserId]);

  // First render with a new roll still has holding=false; hold so pin cannot walk yet.
  const roll = game?.lastRoll ?? null;
  const liveKey = roll ? gameRollKey(roll) : null;
  const isRollerLive = Boolean(
    localUserId && roll && roll.userId === localUserId,
  );
  const awaitingFirstHoldFrame =
    !firstSyncRef.current &&
    liveKey != null &&
    liveKey !== seenRef.current;

  return {
    rolling: isRollerLive ? rolling : false,
    holdPinWalk: holding || awaitingFirstHoldFrame,
    overlay: isRollerLive ? overlay : null,
  };
}

/** @deprecated use DICE_TUMBLE_MS */
export const DICE_ROLL_MS = DICE_TUMBLE_MS;
