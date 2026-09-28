import { useEffect, useRef } from 'react';

import type { Game, Location } from '@/api/types';
import { gameRollKey } from '@/hooks/gameRollKey';
import {
  buildBuyEvent,
  buildCardEvent,
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
  displayAccent?: string | null;
  /**
   * `board` — involved → modal, others toast.
   * Cards: every seated board player gets the modal.
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
 * jail-exit from game WS and route to modal or toast.
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
  const cardSigRef = useRef<string | null>(null);
  const visitSigRef = useRef<string | null>(null);
  const jailStatusRef = useRef<string | null>(null);

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

    if (!readyRef.current) {
      readyRef.current = true;
      deedsSigRef.current = deedsSignature(game);
      paymentSigRef.current = paySig;
      passGoSigRef.current = goSig || null;
      passGoReadyRef.current = true;
      cardSigRef.current = cardSig || null;
      visitSigRef.current = visitKey || null;
      jailStatusRef.current = jailSig;
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
    }
  }, [game, enabled, locations]);

  const present = (event: EconomyEvent, involved: boolean) => {
    // Jail exit decisions → toast for everyone (actor already used the sheet).
    if (event.kind === 'jail_exit') {
      notify({
        type: 'info',
        title: event.toastTitle,
        message: event.toastMessage,
        visibilityTime: 3200,
      });
      return;
    }
    // Board Chance/Chest: every seated player sees the card face.
    const forceModal =
      event.kind === 'card' && surface === 'board' && Boolean(enqueueModal);
    if (surface === 'hub' || (!involved && !forceModal) || !enqueueModal) {
      const unpaid =
        (event.kind === 'rent' || event.kind === 'tax') && !event.paidInFull;
      notify({
        type: unpaid
          ? 'error'
          : event.kind === 'salary' ||
              event.kind === 'buy' ||
              event.kind === 'card'
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

  // Chance / Chest draw after idle (pin settle / cardHold).
  // Dedupe by stable draw id — lastCard persists on the game for the whole table.
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
    // Board → modal for everyone; hub → toast via present().
    present(event, surface === 'board');
  }, [
    enabled,
    game,
    localUserId,
    waitIdle,
    surface,
    enqueueModal,
    displayAccent,
  ]);

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
}
