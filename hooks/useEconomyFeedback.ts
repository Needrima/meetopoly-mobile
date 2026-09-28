import { useEffect, useRef } from 'react';

import type { Game, Location } from '@/api/types';
import { gameRollKey } from '@/hooks/gameRollKey';
import {
  buildBuyEvent,
  buildCardEvent,
  buildJailDoublesFailEvent,
  buildJailExitEvent,
  buildJustVisitingEvent,
  buildPaymentEvent,
  buildSalaryEvent,
  deedsSignature,
  isBuyInvolved,
  isJustVisitingInvolved,
  isRentInvolved,
  isSalaryInvolved,
  isTaxInvolved,
  jailBoardIndex,
  jailStatusSignature,
  lastCardSignature,
  passGoSignature,
  paymentSignature,
  type EconomyEvent,
} from '@/lib/economyFeedback';
import { notify } from '@/lib/notify';

type UseEconomyFeedbackArgs = {
  game: Game | null;
  locations: Location[];
  localUserId: string | null;
  /** Wait for pin settle / hub turn busy before firing. */
  waitIdle: boolean;
  /**
   * Stricter idle for Pass-GO salary — wait until card reveal + pin resume
   * finish so salary does not cover the Chance/Chest modal (Advance to GO).
   * Defaults to `waitIdle`.
   */
  salaryWaitIdle?: boolean;
  displayAccent?: string | null;
  /**
   * `board` — involved → modal, others toast.
   * Cards: drawer → modal; others → toast. Hub → toast.
   * `hub` — always toast.
   */
  surface: 'board' | 'hub';
  /** Board only — enqueue celebration modal. */
  enqueueModal?: (event: EconomyEvent) => void;
  /**
   * When false, seed/skip only (board under hub stack must not also present).
   * @default true
   */
  enabled?: boolean;
};

/**
 * Phase 9.3 / 12.4 — detect buy / rent / tax / salary / card / just-visiting /
 * jail-exit / jail-doubles-fail from game WS and route to modal or toast.
 */
export function useEconomyFeedback({
  game,
  locations,
  localUserId,
  waitIdle,
  salaryWaitIdle,
  displayAccent = null,
  surface,
  enqueueModal,
  enabled = true,
}: UseEconomyFeedbackArgs): void {
  const salaryIdle = salaryWaitIdle ?? waitIdle;
  const readyRef = useRef(false);
  const deedsSigRef = useRef<string | null>(null);
  const paymentSigRef = useRef<string | null>(null);
  const passGoSigRef = useRef<string | null>(null);
  const passGoReadyRef = useRef(false);
  const cardSigRef = useRef<string | null>(null);
  const visitSigRef = useRef<string | null>(null);
  const jailStatusRef = useRef<string | null>(null);
  const jailDoublesFailSigRef = useRef<string>('');

  // Seed signatures on first game snapshot (no historical replay).
  // Also advance sigs while disabled so reuniting focus does not replay.
  useEffect(() => {
    if (!game) {
      return;
    }
    const paySig = game.lastPayment
      ? paymentSignature(game.lastPayment)
      : '';
    const goSig = game.lastRoll?.passedGo
      ? passGoSignature(game.lastRoll)
      : '';
    const cardSig = game.lastCard ? lastCardSignature(game.lastCard) : '';
    const visitKey =
      game.lastRoll &&
      game.lastRoll.toIndex === jailBoardIndex(locations)
        ? gameRollKey(game.lastRoll)
        : '';
    const jailSig = jailStatusSignature(game.players);
    const jailFailKey =
      game.lastRoll &&
      game.players.some(
        (p) =>
          p.userId === game.lastRoll!.userId &&
          p.inJail &&
          game.lastRoll!.fromIndex === jailBoardIndex(locations) &&
          game.lastRoll!.toIndex === game.lastRoll!.fromIndex &&
          !game.lastRoll!.isDoubles &&
          !game.lastRoll!.thirdDoubles,
      )
        ? gameRollKey(game.lastRoll)
        : '';

    if (!readyRef.current) {
      readyRef.current = true;
      deedsSigRef.current = deedsSignature(game);
      paymentSigRef.current = paySig;
      passGoSigRef.current = goSig || null;
      passGoReadyRef.current = true;
      cardSigRef.current = cardSig || null;
      visitSigRef.current = visitKey || null;
      jailStatusRef.current = jailSig;
      jailDoublesFailSigRef.current = jailFailKey;
      return;
    }
    if (!enabled) {
      deedsSigRef.current = deedsSignature(game);
      paymentSigRef.current = paySig;
      if (goSig) {
        passGoSigRef.current = goSig;
      }
      if (cardSig) {
        cardSigRef.current = cardSig;
      }
      if (visitKey) {
        visitSigRef.current = visitKey;
      }
      jailStatusRef.current = jailSig;
      if (jailFailKey) {
        jailDoublesFailSigRef.current = jailFailKey;
      }
    }
  }, [game, enabled, locations]);

  const present = (event: EconomyEvent, involved: boolean) => {
    // Jail exit / failed doubles → toast for the whole table.
    if (event.kind === 'jail_exit' || event.kind === 'jail_doubles_fail') {
      notify({
        type: 'info',
        title: event.toastTitle,
        message: event.toastMessage,
        visibilityTime: 3200,
      });
      return;
    }
    // Chance/Chest: drawer on board → modal only; everyone else (and hub) → toast.
    if (event.kind === 'card') {
      if (surface === 'board' && involved && enqueueModal) {
        enqueueModal(event);
        return;
      }
      notify({
        type: event.cashDelta < 0 ? 'error' : 'success',
        title: event.toastTitle,
        message: event.toastMessage,
        visibilityTime: 3200,
      });
      return;
    }
    if (surface === 'hub' || !involved || !enqueueModal) {
      const unpaid =
        (event.kind === 'rent' || event.kind === 'tax') && !event.paidInFull;
      notify({
        type: unpaid
          ? 'error'
          : event.kind === 'salary' || event.kind === 'buy'
            ? 'success'
            : 'info',
        title: event.toastTitle,
        message: event.toastMessage,
        visibilityTime: 3200,
      });
      return;
    }
    enqueueModal(event);
  };

  // New deeds.
  useEffect(() => {
    if (!enabled || !localUserId || !game || !readyRef.current) {
      return;
    }
    const sig = deedsSignature(game);
    if (deedsSigRef.current === null) {
      deedsSigRef.current = sig;
      return;
    }
    if (sig === deedsSigRef.current) {
      return;
    }
    const prev = new Set(
      deedsSigRef.current ? deedsSigRef.current.split('|').filter(Boolean) : [],
    );
    deedsSigRef.current = sig;
    const deeds = game.deeds ?? [];
    for (const d of deeds) {
      const key = `${d.boardIndex}:${d.ownerUserId}`;
      if (prev.has(key)) {
        continue;
      }
      const loc = locations.find((l) => l.boardIndex === d.boardIndex);
      const event = buildBuyEvent({
        deed: d,
        location: loc,
        locations,
        deeds,
        localUserId,
        players: game.players,
        displayAccent,
      });
      present(event, isBuyInvolved(localUserId, d.ownerUserId));
    }
  }, [
    enabled,
    game,
    localUserId,
    locations,
    surface,
    enqueueModal,
    displayAccent,
  ]);

  // Chance / Chest draw after idle (pin settle / cardHold).
  // Dedupe by stable draw id — lastCard persists on the game for the whole table.
  // Declared before salary so same-tick idle (hub) presents card first.
  useEffect(() => {
    if (!enabled || !localUserId || !game || !readyRef.current || waitIdle) {
      return;
    }
    const card = game.lastCard;
    if (!card) {
      return;
    }
    const sig = lastCardSignature(card);
    if (sig === cardSigRef.current) {
      return;
    }
    cardSigRef.current = sig;
    const event = buildCardEvent({
      card,
      localUserId,
      players: game.players,
      displayAccent,
    });
    const iDrew = card.userId === localUserId;
    // Board drawer → modal only; others / hub → toast.
    present(event, surface === 'board' && iDrew);
  }, [
    enabled,
    game,
    localUserId,
    waitIdle,
    surface,
    enqueueModal,
    displayAccent,
  ]);

  // Pass-GO / salary after full settle (not during Chance/Chest hold/modal).
  // After card effect so hub toasts keep card → salary order when both unlock.
  useEffect(() => {
    if (!enabled || !localUserId || !passGoReadyRef.current || salaryIdle) {
      return;
    }
    const roll = game?.lastRoll;
    if (!roll?.passedGo || roll.passGoAmount <= 0) {
      return;
    }
    const key = passGoSignature(roll);
    if (passGoSigRef.current === key) {
      return;
    }
    passGoSigRef.current = key;
    const event = buildSalaryEvent({
      amount: roll.passGoAmount,
      username: roll.username,
      localUserId,
      passerUserId: roll.userId,
    });
    present(event, isSalaryInvolved(localUserId, roll.userId));
  }, [
    enabled,
    game?.lastRoll,
    salaryIdle,
    localUserId,
    surface,
    enqueueModal,
    displayAccent,
  ]);

  // Rent / tax after idle — after salary so wrap-to-rent stays salary → rent.
  useEffect(() => {
    if (!enabled || !localUserId || !game || !readyRef.current || waitIdle) {
      return;
    }
    const p = game.lastPayment;
    if (!p) {
      return;
    }
    const sig = paymentSignature(p);
    if (paymentSigRef.current === null) {
      paymentSigRef.current = sig;
      return;
    }
    if (sig === paymentSigRef.current) {
      return;
    }
    paymentSigRef.current = sig;
    const event = buildPaymentEvent({
      payment: p,
      localUserId,
      players: game.players,
      displayAccent,
    });
    if (!event) {
      return;
    }
    const involved =
      p.kind === 'tax'
        ? isTaxInvolved(localUserId, p.fromUserId)
        : isRentInvolved(localUserId, p.fromUserId, p.toUserId);
    present(event, involved);

    const iPaid = p.fromUserId === localUserId;
    if (iPaid && !p.paidInFull) {
      notify({
        type: 'error',
        title: 'Cannot afford full amount',
        message:
          'End and Roll are blocked. Resign to leave (bankruptcy rules come later).',
      });
    }
  }, [enabled, game, localUserId, waitIdle, surface, enqueueModal, displayAccent]);

  // Just Visiting after idle.
  // Consume jail-bound rolls while `inJail` so a later pay/card leave (same
  // lastRoll) does not falsely fire Just Visiting.
  useEffect(() => {
    if (!enabled || !localUserId || !game || !readyRef.current || waitIdle) {
      return;
    }
    const roll = game.lastRoll;
    if (!roll) {
      return;
    }
    const jailIdx = jailBoardIndex(locations);
    if (roll.toIndex !== jailIdx) {
      return;
    }
    const key = gameRollKey(roll);
    if (visitSigRef.current === key) {
      return;
    }
    if (roll.thirdDoubles) {
      visitSigRef.current = key;
      return;
    }
    const mover = game.players.find((p) => p.userId === roll.userId);
    if (!mover) {
      return;
    }
    if (mover.inJail) {
      // Go to Jail / card jail / third doubles — not Just Visiting.
      visitSigRef.current = key;
      return;
    }
    visitSigRef.current = key;
    const event = buildJustVisitingEvent({
      username: roll.username,
      userId: roll.userId,
      localUserId,
      players: game.players,
      displayAccent,
    });
    present(event, isJustVisitingInvolved(localUserId, roll.userId));
  }, [
    enabled,
    game,
    localUserId,
    waitIdle,
    locations,
    surface,
    enqueueModal,
    displayAccent,
  ]);

  // Jail exit (fine / card / doubles) → toast for table.
  // Reason priority: GOOJF spent → card; doubles roll from Jail → doubles;
  // otherwise fine (pay or forced 3rd-fail). Do not trust stale lastPayment.
  useEffect(() => {
    if (!enabled || !localUserId || !game || !readyRef.current) {
      return;
    }
    const sig = jailStatusSignature(game.players);
    if (jailStatusRef.current === null) {
      jailStatusRef.current = sig;
      return;
    }
    if (sig === jailStatusRef.current) {
      return;
    }
    const prevMap = new Map<string, { inJail: boolean; goojf: number }>();
    for (const part of jailStatusRef.current.split('|')) {
      if (!part) {
        continue;
      }
      const [uid, inj, go] = part.split(':');
      if (uid) {
        prevMap.set(uid, { inJail: inj === '1', goojf: Number(go) || 0 });
      }
    }
    jailStatusRef.current = sig;
    const jailIdx = jailBoardIndex(locations);

    for (const p of game.players) {
      const prev = prevMap.get(p.userId);
      if (!prev?.inJail || p.inJail) {
        continue;
      }
      let reason: 'fine' | 'card' | 'doubles' = 'fine';
      if (p.getOutOfJailFree < prev.goojf) {
        reason = 'card';
      } else if (
        game.lastRoll &&
        game.lastRoll.userId === p.userId &&
        game.lastRoll.isDoubles &&
        !game.lastRoll.thirdDoubles &&
        game.lastRoll.fromIndex === jailIdx
      ) {
        reason = 'doubles';
      }
      const event = buildJailExitEvent({
        reason,
        username: p.username,
        localUserId,
        userId: p.userId,
      });
      present(event, false);
    }
  }, [enabled, game, localUserId, locations, surface, enqueueModal]);

  // Failed jail doubles (still in Jail) → toast for the table.
  useEffect(() => {
    if (!enabled || !localUserId || !game || !readyRef.current) {
      return;
    }
    const roll = game.lastRoll;
    if (!roll || roll.isDoubles || roll.thirdDoubles) {
      return;
    }
    const jailIdx = jailBoardIndex(locations);
    if (roll.fromIndex !== jailIdx || roll.toIndex !== roll.fromIndex) {
      return;
    }
    const mover = game.players.find((p) => p.userId === roll.userId);
    if (!mover?.inJail) {
      return;
    }
    const key = gameRollKey(roll);
    if (key === jailDoublesFailSigRef.current) {
      return;
    }
    jailDoublesFailSigRef.current = key;
    const event = buildJailDoublesFailEvent({
      username: roll.username,
      localUserId,
      userId: roll.userId,
      jailTurns: mover.jailTurns,
    });
    present(event, false);
  }, [enabled, game, localUserId, locations, surface, enqueueModal]);
}
