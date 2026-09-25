import { useEffect, useRef, useState } from 'react';

import type { Game } from '@/api/types';
import { gameRollKey } from '@/hooks/gameRollKey';
import { useDiceRollMotion } from '@/hooks/useDiceRollMotion';
import { PIN_STEP_MS } from '@/hooks/useGamePinMotion';

const BOARD_SPACES = 40;

/**
 * Hub mirror of board `turnBusy` (dice hold + pin walk) without a board layout.
 * Gates End / buy prompt until the same settle window as the board.
 */
export function useHubTurnBusy(game: Game | null): boolean {
  const { holdPinWalk } = useDiceRollMotion(game);
  const [pinBusy, setPinBusy] = useState(false);
  const pendingPinKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const roll = game?.lastRoll ?? null;
    const key = roll ? gameRollKey(roll) : null;

    if (holdPinWalk && key) {
      pendingPinKeyRef.current = key;
      setPinBusy(true);
      return;
    }

    if (
      pendingPinKeyRef.current &&
      pendingPinKeyRef.current === key &&
      roll
    ) {
      const delta =
        (roll.toIndex - roll.fromIndex + BOARD_SPACES) % BOARD_SPACES;
      const steps =
        roll.thirdDoubles || delta === 0
          ? 0
          : Math.max(1, Math.min(BOARD_SPACES - 1, delta));
      if (steps === 0) {
        pendingPinKeyRef.current = null;
        setPinBusy(false);
        return;
      }
      const ms = steps * PIN_STEP_MS;
      setPinBusy(true);
      const t = setTimeout(() => {
        pendingPinKeyRef.current = null;
        setPinBusy(false);
      }, ms);
      return () => clearTimeout(t);
    }

    if (!holdPinWalk && !pendingPinKeyRef.current) {
      setPinBusy(false);
    }
  }, [holdPinWalk, game?.lastRoll]);

  return holdPinWalk || pinBusy;
}
