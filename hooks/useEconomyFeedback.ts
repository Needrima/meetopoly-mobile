import { useEffect, useRef } from 'react';

import type { Game, Location } from '@/api/types';
import {
  buildBuyEvent,
  buildPaymentEvent,
  buildSalaryEvent,
  deedsSignature,
  isBuyInvolved,
  isRentInvolved,
  isSalaryInvolved,
  isTaxInvolved,
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
  displayAccent?: string | null;
  /**
   * `board` — involved → modal, others toast.
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
 * Phase 9.3 — detect buy / rent / tax / salary from game WS and route to
 * modal (board involved) or toast (spectators + hub).
 */
export function useEconomyFeedback({
  game,
  locations,
  localUserId,
  waitIdle,
  displayAccent = null,
  surface,
  enqueueModal,
  enabled = true,
}: UseEconomyFeedbackArgs): void {
  const readyRef = useRef(false);
  const deedsSigRef = useRef<string | null>(null);
  const paymentSigRef = useRef<string | null>(null);
  const passGoSigRef = useRef<string | null>(null);
  const passGoReadyRef = useRef(false);

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
    if (!readyRef.current) {
      readyRef.current = true;
      deedsSigRef.current = deedsSignature(game);
      // '' = "no payment yet" so the first real payment is not swallowed.
      paymentSigRef.current = paySig;
      passGoSigRef.current = goSig || null;
      passGoReadyRef.current = true;
      return;
    }
    if (!enabled) {
      deedsSigRef.current = deedsSignature(game);
      paymentSigRef.current = paySig;
      if (goSig) {
        passGoSigRef.current = goSig;
      }
    }
  }, [game, enabled]);

  const present = (event: EconomyEvent, involved: boolean) => {
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

  // Pass-GO / salary after idle.
  useEffect(() => {
    // Wait for localUserId so buyer/passer get a modal, not a mis-routed toast.
    if (!enabled || !localUserId || !passGoReadyRef.current || waitIdle) {
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
    waitIdle,
    localUserId,
    surface,
    enqueueModal,
    displayAccent,
  ]);

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

  // Rent / tax after idle.
  useEffect(() => {
    if (!enabled || !localUserId || !game || !readyRef.current || waitIdle) {
      return;
    }
    const p = game.lastPayment;
    if (!p) {
      return;
    }
    const sig = paymentSignature(p);
    // paymentSigRef is '' after seed with no history — first payment must present.
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
}
