import { useEffect, useRef, useState } from 'react';

import type { Game } from '@/api/types';
import { gameRollKey } from '@/hooks/gameRollKey';
import {
  cardRevealHoldMs,
  pinMotionDurationMs,
  planPinMotion,
} from '@/hooks/useGamePinMotion';

type PinPhase = 'idle' | 'dice' | 'pin';

/**
 * Hub mirror of board `turnBusy` (dice hold + pin walk) without a board layout.
 * Gates End / buy prompt until the same settle window as the board.
 *
 * Phase 22.3 — start the pin timer once when dice hold clears; if `lastCard`
 * arrives later and lengthens the plan, extend remaining time (do not restart
 * from zero). Timer is kept in a ref so effect re-runs (new `game` identity)
 * do not cancel an in-flight pin settle.
 */
export function useHubTurnBusy(
  game: Game | null,
  holdPinWalk: boolean,
  localUserId: string | null = null,
): boolean {
  const [pinBusy, setPinBusy] = useState(false);
  const rollKeyRef = useRef<string | null>(null);
  const phaseRef = useRef<PinPhase>('idle');
  const pinStartedAtRef = useRef(0);
  const plannedMsRef = useRef(0);
  const pinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearPinTimer = () => {
      if (pinTimerRef.current != null) {
        clearTimeout(pinTimerRef.current);
        pinTimerRef.current = null;
      }
    };

    const armPinTimer = (msFromStart: number) => {
      clearPinTimer();
      const elapsed = Date.now() - pinStartedAtRef.current;
      const remaining = msFromStart - elapsed;
      if (remaining <= 0) {
        phaseRef.current = 'idle';
        plannedMsRef.current = 0;
        setPinBusy(false);
        return;
      }
      setPinBusy(true);
      pinTimerRef.current = setTimeout(() => {
        phaseRef.current = 'idle';
        plannedMsRef.current = 0;
        pinTimerRef.current = null;
        setPinBusy(false);
      }, remaining);
    };

    const roll = game?.lastRoll ?? null;
    const key = roll ? gameRollKey(roll) : null;

    if (!game || !roll || !key) {
      clearPinTimer();
      rollKeyRef.current = null;
      phaseRef.current = 'idle';
      plannedMsRef.current = 0;
      setPinBusy(false);
      return;
    }

    if (key !== rollKeyRef.current) {
      clearPinTimer();
      rollKeyRef.current = key;
      phaseRef.current = 'idle';
      plannedMsRef.current = 0;
    }

    if (holdPinWalk) {
      // Dice theater — drop any pin timer; pin phase starts after hold clears.
      clearPinTimer();
      phaseRef.current = 'dice';
      setPinBusy(true);
      return;
    }

    const ms = pinMotionDurationMs(
      planPinMotion(roll, game.players, game.lastCard, {
        cardHoldMs: cardRevealHoldMs(game.lastCard, localUserId),
      }),
    );

    if (ms <= 0) {
      clearPinTimer();
      phaseRef.current = 'idle';
      plannedMsRef.current = 0;
      setPinBusy(false);
      return;
    }

    if (phaseRef.current === 'dice' || phaseRef.current === 'idle') {
      phaseRef.current = 'pin';
      pinStartedAtRef.current = Date.now();
      plannedMsRef.current = ms;
      armPinTimer(ms);
      return;
    }

    // Already in pin phase: keep existing timer unless plan grew (lastCard).
    if (ms > plannedMsRef.current) {
      plannedMsRef.current = ms;
      armPinTimer(ms);
      return;
    }

    // Same (or shorter) plan — ensure a timer is still armed after remounts /
    // effect re-runs. Do not reset pinStartedAt.
    if (pinTimerRef.current == null && phaseRef.current === 'pin') {
      armPinTimer(plannedMsRef.current);
    }
  }, [
    holdPinWalk,
    localUserId,
    game?.lastRoll,
    game?.players,
    game?.lastCard,
  ]);

  // Unmount only — in-flight pin timer must survive game identity churn.
  useEffect(() => {
    return () => {
      if (pinTimerRef.current != null) {
        clearTimeout(pinTimerRef.current);
        pinTimerRef.current = null;
      }
    };
  }, []);

  return holdPinWalk || pinBusy;
}
