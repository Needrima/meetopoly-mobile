import { useEffect, useRef, useState } from 'react';

import type { Game, GameLastCard, GameLastRoll, GamePlayer } from '@/api/types';
import type { BoardLayout } from '@/components/board/boardLayout';
import {
  buildGamePins,
  type BoardPinModel,
  type GamePinPlayer,
} from '@/components/board/boardPins';
import { gameRollKey } from '@/hooks/gameRollKey';
import {
  CARD_REVEAL_HOLD_MS,
  ECONOMY_MODAL_MS,
  JAIL_BOARD_INDEX,
} from '@/lib/economyFeedback';

const BOARD_SPACES = 40;
/** ms between tile hops — ~2s for a typical 7. */
export const PIN_STEP_MS = 200;
/** Straight-line teleport to Jail (Go-to-Jail / cards / third doubles). */
export const PIN_JUMP_MS = 480;

type PendingWalk = {
  key: string;
  roll: GameLastRoll;
  startPlayers: GamePinPlayer[];
  finalPlayers: GamePinPlayer[];
  settledPlayers: GamePlayer[];
  lastCard: GameLastCard | null;
};

type WalkTimers = {
  key: string;
  timeout: ReturnType<typeof setTimeout> | null;
};

/** How the mover pin should travel for this lastRoll. */
export type PinMotionPlan =
  | { kind: 'snap' }
  | { kind: 'jump' }
  | { kind: 'walk'; steps: number }
  | { kind: 'walkThenJump'; walkSteps: number }
  /** Land on Chance/Chest, hold for card modal, then jump to final. */
  | { kind: 'walkThenHoldThenJump'; walkSteps: number; holdMs: number }
  /** Land on Chance/Chest, hold for card modal, then walk onward. */
  | {
      kind: 'walkThenHoldThenWalk';
      walkSteps: number;
      holdMs: number;
      resumeSteps: number;
    };

export type PlanPinMotionOpts = {
  /**
   * Chance/Chest park duration. Drawer (fly + modal) uses `CARD_REVEAL_HOLD_MS`;
   * spectators skip fly (22.2) so default to `ECONOMY_MODAL_MS` when omitted callers
   * pass explicitly via `cardRevealHoldMs`.
   */
  cardHoldMs?: number;
};

/** Phase 22.3 — drawer holds for fly+modal; others for toast/modal window only. */
export function cardRevealHoldMs(
  lastCard: GameLastCard | null | undefined,
  localUserId: string | null,
): number {
  if (lastCard && localUserId && lastCard.userId === localUserId) {
    return CARD_REVEAL_HOLD_MS;
  }
  return ECONOMY_MODAL_MS;
}

/**
 * Jail teleports: walk dice path then jump (no ring past GO).
 * Card teleports: walk to Chance/Chest, hold for reveal modal, then move.
 */
export function planPinMotion(
  roll: GameLastRoll,
  players: GamePlayer[],
  lastCard?: GameLastCard | null,
  opts?: PlanPinMotionOpts,
): PinMotionPlan {
  const holdMs = opts?.cardHoldMs ?? CARD_REVEAL_HOLD_MS;
  const mover = players.find((p) => p.userId === roll.userId);
  const diceLand = (roll.fromIndex + roll.total) % BOARD_SPACES;

  // Failed jail doubles (or broke 3rd fail): stay on Jail — dice only, no pin walk-back.
  if (
    mover?.inJail &&
    roll.toIndex === roll.fromIndex &&
    !roll.thirdDoubles
  ) {
    return { kind: 'snap' };
  }

  const jailTeleport =
    Boolean(mover?.inJail) &&
    (roll.thirdDoubles || diceLand !== roll.toIndex);

  if (jailTeleport) {
    // Card "Go to Jail" also sets inJail — prefer card hold when lastCard matches.
    const cardJail =
      lastCard &&
      lastCard.userId === roll.userId &&
      (lastCard.cardId === 'chance_go_to_jail' ||
        lastCard.cardId === 'chest_go_to_jail') &&
      diceLand !== roll.toIndex &&
      !roll.thirdDoubles;
    if (cardJail) {
      const walkSteps = Math.max(1, Math.min(BOARD_SPACES - 1, roll.total));
      return {
        kind: 'walkThenHoldThenJump',
        walkSteps,
        holdMs,
      };
    }
    if (roll.thirdDoubles || roll.total <= 0) {
      return { kind: 'jump' };
    }
    const walkSteps = Math.max(1, Math.min(BOARD_SPACES - 1, roll.total));
    return { kind: 'walkThenJump', walkSteps };
  }

  const cardMoved =
    Boolean(lastCard) &&
    lastCard!.userId === roll.userId &&
    diceLand !== roll.toIndex;

  if (cardMoved) {
    const walkSteps = Math.max(1, Math.min(BOARD_SPACES - 1, roll.total));
    const resumeSteps =
      (roll.toIndex - diceLand + BOARD_SPACES) % BOARD_SPACES;
    // Go Back 3 (and zero-step) → jump. All advance / trip / nearest → clockwise walk.
    const isGoBack = lastCard?.cardId === 'chance_go_back_3';
    if (isGoBack || resumeSteps === 0) {
      return {
        kind: 'walkThenHoldThenJump',
        walkSteps,
        holdMs,
      };
    }
    return {
      kind: 'walkThenHoldThenWalk',
      walkSteps,
      holdMs,
      resumeSteps,
    };
  }

  const delta = (roll.toIndex - roll.fromIndex + BOARD_SPACES) % BOARD_SPACES;
  if (roll.thirdDoubles || delta === 0) {
    return { kind: 'snap' };
  }
  return {
    kind: 'walk',
    steps: Math.max(1, Math.min(BOARD_SPACES - 1, delta)),
  };
}

export function pinMotionDurationMs(plan: PinMotionPlan): number {
  switch (plan.kind) {
    case 'snap':
      return 0;
    case 'jump':
      return PIN_JUMP_MS;
    case 'walk':
      return plan.steps * PIN_STEP_MS;
    case 'walkThenJump':
      return plan.walkSteps * PIN_STEP_MS + PIN_STEP_MS + PIN_JUMP_MS;
    case 'walkThenHoldThenJump':
      return (
        plan.walkSteps * PIN_STEP_MS +
        PIN_STEP_MS +
        plan.holdMs +
        PIN_JUMP_MS
      );
    case 'walkThenHoldThenWalk':
      return (
        plan.walkSteps * PIN_STEP_MS +
        PIN_STEP_MS +
        plan.holdMs +
        plan.resumeSteps * PIN_STEP_MS
      );
  }
}

function asPins(
  players: GamePlayer[],
  localUserId: string | null,
  localAccent: string | null,
): GamePinPlayer[] {
  return players
    .filter((p) => !p.resigned)
    .map((p) => ({
      userId: p.userId,
      boardIndex: p.boardIndex,
      inJail: p.inJail,
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
  lastCard: GameLastCard | null,
): PendingWalk {
  const moverId = roll.userId;
  const colored = asPins(players, localUserId, localAccent);
  return {
    key: gameRollKey(roll),
    roll,
    settledPlayers: players,
    lastCard,
    finalPlayers: colored,
    startPlayers: colored.map((p) =>
      p.userId === moverId ? { ...p, boardIndex: roll.fromIndex } : p,
    ),
  };
}

/**
 * Drives game pins: snap on first paint; on new lastRoll, walk the mover tile-by-tile.
 * Chance/Chest move cards: pause on the deck tile (`cardHold`) for the reveal modal,
 * then resume to the card destination.
 */
export function useGamePinMotion(opts: {
  layout: BoardLayout | null;
  game: Game | null;
  localUserId: string | null;
  pinRadius: number;
  holdWalk?: boolean;
  localAccent?: string | null;
}): { pins: BoardPinModel[]; animating: boolean; cardHold: boolean } {
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
  const [cardHold, setCardHold] = useState(false);
  const seenRollRef = useRef<string | null>(null);
  const firstSyncRef = useRef(true);
  const animatingRef = useRef(false);
  const cardHoldRef = useRef(false);
  const pendingRef = useRef<PendingWalk | null>(null);
  const walkRef = useRef<WalkTimers | null>(null);
  const cancelledRef = useRef(false);

  const clearWalkTimer = () => {
    if (walkRef.current?.timeout != null) {
      clearTimeout(walkRef.current.timeout);
      walkRef.current.timeout = null;
    }
  };

  const setHold = (on: boolean) => {
    cardHoldRef.current = on;
    setCardHold(on);
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
      setHold(false);
      firstSyncRef.current = true;
      seenRollRef.current = null;
      pendingRef.current = null;
      return;
    }

    const roll = game.lastRoll ?? null;
    const key = roll ? gameRollKey(roll) : null;
    const lastCard = game.lastCard ?? null;

    const finishMotion = (pendingKey: string) => {
      if (cancelledRef.current || walkRef.current?.key !== pendingKey) {
        return;
      }
      setHold(false);
      setAnimating(false);
      animatingRef.current = false;
      walkRef.current = null;
    };

    const scheduleJumpToFinal = (
      pending: PendingWalk,
      delayMs: number,
    ) => {
      if (!walkRef.current) {
        return;
      }
      walkRef.current.timeout = setTimeout(() => {
        if (cancelledRef.current || walkRef.current?.key !== pending.key) {
          return;
        }
        setHold(false);
        setDisplayPlayers(pending.finalPlayers);
        if (walkRef.current) {
          walkRef.current.timeout = setTimeout(
            () => finishMotion(pending.key),
            PIN_JUMP_MS,
          );
        }
      }, delayMs);
    };

    const scheduleResumeWalk = (
      pending: PendingWalk,
      fromIndex: number,
      resumeSteps: number,
      delayMs: number,
    ) => {
      if (!walkRef.current) {
        return;
      }
      walkRef.current.timeout = setTimeout(() => {
        if (cancelledRef.current || walkRef.current?.key !== pending.key) {
          return;
        }
        setHold(false);
        let step = 0;
        const tick = () => {
          if (cancelledRef.current || walkRef.current?.key !== pending.key) {
            return;
          }
          step += 1;
          const idx = (fromIndex + step) % BOARD_SPACES;
          setDisplayPlayers((prev) =>
            prev.map((p) =>
              p.userId === pending.roll.userId
                ? { ...p, boardIndex: idx }
                : p,
            ),
          );
          if (step >= resumeSteps) {
            setDisplayPlayers(pending.finalPlayers);
            finishMotion(pending.key);
            return;
          }
          if (walkRef.current) {
            walkRef.current.timeout = setTimeout(tick, PIN_STEP_MS);
          }
        };
        if (walkRef.current) {
          walkRef.current.timeout = setTimeout(tick, PIN_STEP_MS);
        }
      }, delayMs);
    };

    const startWalk = (pending: PendingWalk) => {
      const { roll: r, startPlayers, finalPlayers, settledPlayers, lastCard: card } =
        pending;
      const moverId = r.userId;
      const plan = planPinMotion(r, settledPlayers, card, {
        cardHoldMs: cardRevealHoldMs(card, localUserId),
      });

      if (walkRef.current?.key === pending.key && animatingRef.current) {
        return;
      }

      clearWalkTimer();
      seenRollRef.current = pending.key;
      pendingRef.current = null;
      setHold(false);

      if (plan.kind === 'snap') {
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

      if (plan.kind === 'jump') {
        scheduleJumpToFinal(pending, 0);
        return;
      }

      const steps =
        plan.kind === 'walk'
          ? plan.steps
          : plan.walkSteps;
      const thenJump = plan.kind === 'walkThenJump';
      const thenHoldJump = plan.kind === 'walkThenHoldThenJump';
      const thenHoldWalk = plan.kind === 'walkThenHoldThenWalk';
      const holdMs =
        thenHoldJump || thenHoldWalk ? plan.holdMs : 0;
      const resumeSteps = thenHoldWalk ? plan.resumeSteps : 0;
      const diceLand = (r.fromIndex + r.total) % BOARD_SPACES;

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
          if (thenJump) {
            scheduleJumpToFinal(pending, PIN_STEP_MS);
            return;
          }
          if (thenHoldJump || thenHoldWalk) {
            // Park on Chance/Chest — open card modal via cardHold.
            setHold(true);
            if (thenHoldJump) {
              scheduleJumpToFinal(pending, PIN_STEP_MS + holdMs);
            } else {
              scheduleResumeWalk(
                pending,
                diceLand,
                resumeSteps,
                PIN_STEP_MS + holdMs,
              );
            }
            return;
          }
          setDisplayPlayers(finalPlayers);
          finishMotion(pending.key);
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
      setHold(false);
      return;
    }

    if (
      !holdWalk &&
      pendingRef.current &&
      pendingRef.current.key !== seenRollRef.current
    ) {
      startWalk(pendingRef.current);
      return;
    }

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

    if (!roll || !key) {
      return;
    }
    const pending = buildPending(
      roll,
      game.players,
      localUserId,
      localAccent,
      lastCard,
    );
    pendingRef.current = pending;
    setDisplayPlayers(pending.startPlayers);

    const plan = planPinMotion(roll, game.players, lastCard, {
      cardHoldMs: cardRevealHoldMs(lastCard, localUserId),
    });
    if (pinMotionDurationMs(plan) > 0) {
      setAnimating(true);
      animatingRef.current = true;
    }

    if (!holdWalk) {
      startWalk(pending);
      return;
    }
  }, [game, holdWalk, localUserId, localAccent]);

  if (!layout || !displayPlayers.length) {
    return { pins: [], animating, cardHold };
  }

  return {
    pins: buildGamePins({
      layout,
      players: displayPlayers,
      localUserId,
      pinRadius,
      jailBoardIndex: JAIL_BOARD_INDEX,
    }),
    animating,
    cardHold,
  };
}
