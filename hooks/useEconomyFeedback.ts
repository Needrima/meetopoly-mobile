import { useEffect, useRef } from 'react';

import type { Game, Location } from '@/api/types';
import { gameRollKey } from '@/hooks/gameRollKey';
import {
  buildBuyEvent,
  buildCardEvent,
  buildJailDoublesFailEvent,
  buildJailExitEvent,
  buildJustVisitingEvent,
  buildLandsReceivedEvent,
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
  lastAuctionSignature,
  lastTradeSignature,
  openTradeSignature,
  debtPaySignature,
  lastBankruptcySignature,
  passGoSignature,
  paymentSignature,
  type EconomyEvent,
} from '@/lib/economyFeedback';
import { formatUsername } from '@/lib/formatUsername';
import { notify } from '@/lib/notify';
import { stripWorldNamePrefix } from '@/components/board/deedVisual';

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
  const lastAuctionSigRef = useRef<string | null>(null);
  const lastTradeSigRef = useRef<string | null>(null);
  const openTradeSigRef = useRef<string | null>(null);
  const debtPaySigRef = useRef<string | null>(null);
  const lastBankruptcySigRef = useRef<string | null>(null);

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
    const auctionSig = game.lastAuction
      ? lastAuctionSignature(game.lastAuction)
      : '';
    const tradeSig = game.lastTrade ? lastTradeSignature(game.lastTrade) : '';
    const openTradeSig = game.trade ? openTradeSignature(game.trade) : '';
    const debtPaySig = game.debtPay ? debtPaySignature(game.debtPay) : '';
    const bankruptcySig = game.lastBankruptcy
      ? lastBankruptcySignature(game.lastBankruptcy)
      : '';
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
      lastAuctionSigRef.current = auctionSig || null;
      lastTradeSigRef.current = tradeSig || null;
      openTradeSigRef.current = openTradeSig || null;
      debtPaySigRef.current = debtPaySig || null;
      lastBankruptcySigRef.current = bankruptcySig || null;
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
      if (auctionSig) {
        lastAuctionSigRef.current = auctionSig;
      }
      if (tradeSig) {
        lastTradeSigRef.current = tradeSig;
      }
      openTradeSigRef.current = openTradeSig || null;
      debtPaySigRef.current = debtPaySig || null;
      if (bankruptcySig) {
        lastBankruptcySigRef.current = bankruptcySig;
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
          : event.kind === 'salary' ||
              event.kind === 'buy' ||
              event.kind === 'lands_received'
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

  // New deeds. Single list-price / transfer → buy modal; 2+ for one owner → lands-received pills.
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
    const la = game.lastAuction;
    const deeds = game.deeds ?? [];
    const fresh = deeds.filter((d) => {
      const key = `${d.boardIndex}:${d.ownerUserId}`;
      if (prev.has(key)) {
        return false;
      }
      if (
        la &&
        !la.void &&
        la.boardIndex === d.boardIndex &&
        la.winnerUserId === d.ownerUserId
      ) {
        return false;
      }
      return true;
    });
    if (fresh.length === 0) {
      return;
    }

    const byOwner = new Map<string, typeof fresh>();
    for (const d of fresh) {
      const list = byOwner.get(d.ownerUserId) ?? [];
      list.push(d);
      byOwner.set(d.ownerUserId, list);
    }

    for (const [ownerId, owned] of byOwner) {
      if (owned.length >= 2) {
        const locs = owned
          .map((d) => locations.find((l) => l.boardIndex === d.boardIndex))
          .filter((l): l is NonNullable<typeof l> => Boolean(l));
        if (locs.length === 0) {
          continue;
        }
        const ownerName = owned[0]?.ownerUsername ?? '';
        const event = buildLandsReceivedEvent({
          locations: locs,
          receiverUserId: ownerId,
          receiverUsername: ownerName,
          localUserId,
          players: game.players,
          displayAccent,
        });
        present(event, isBuyInvolved(localUserId, ownerId));
        continue;
      }
      for (const d of owned) {
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

  // Phase 13.1 — auction settle/void: toast for all; winner modal @ auction price.
  useEffect(() => {
    if (!enabled || !localUserId || !game || !readyRef.current) {
      return;
    }
    const la = game.lastAuction;
    if (!la) {
      return;
    }
    const sig = lastAuctionSignature(la);
    if (sig === lastAuctionSigRef.current) {
      return;
    }
    lastAuctionSigRef.current = sig;
    const place = stripWorldNamePrefix(la.spaceName || `space ${la.boardIndex}`);
    if (la.void) {
      notify({
        type: 'info',
        title: 'Auction void',
        message: `${place} stays unowned`,
      });
      return;
    }
    const winnerName = formatUsername(la.winnerUsername ?? '') || 'Someone';
    const amount = la.amount ?? 0;
    notify({
      type: 'success',
      title: 'Auction won',
      message: `${winnerName} won auction for ${place}${amount > 0 ? ` · ${amount}` : ''}`,
    });
    const iWon = Boolean(la.winnerUserId && la.winnerUserId === localUserId);
    if (!iWon || surface !== 'board' || !enqueueModal) {
      return;
    }
    const deed = (game.deeds ?? []).find(
      (d) =>
        d.boardIndex === la.boardIndex && d.ownerUserId === la.winnerUserId,
    );
    if (!deed) {
      return;
    }
    const loc = locations.find((l) => l.boardIndex === la.boardIndex);
    const event = buildBuyEvent({
      deed,
      location: loc,
      locations,
      deeds: game.deeds ?? [],
      localUserId,
      players: game.players,
      displayAccent,
      priceOverride: amount,
    });
    enqueueModal(event);
  }, [
    enabled,
    game,
    localUserId,
    locations,
    surface,
    enqueueModal,
    displayAccent,
  ]);

  // Phase 13.3 — open trade: toast only for players not in the offer.
  useEffect(() => {
    if (!enabled || !localUserId || !game || !readyRef.current) {
      return;
    }
    const trade = game.trade;
    if (!trade) {
      openTradeSigRef.current = null;
      return;
    }
    const sig = openTradeSignature(trade);
    if (sig === openTradeSigRef.current) {
      return;
    }
    openTradeSigRef.current = sig;
    if (
      trade.fromUserId === localUserId ||
      trade.toUserId === localUserId
    ) {
      return;
    }
    const fromName = formatUsername(trade.fromUsername) || 'Someone';
    const toName = formatUsername(trade.toUsername) || 'someone';
    notify({
      type: 'info',
      title: 'Trade offer',
      message: `${fromName} offered a trade to ${toName}`,
    });
  }, [enabled, game, localUserId]);

  // Phase 13.3 — trade accept / decline (incl. reply timeout) toasts for all.
  useEffect(() => {
    if (!enabled || !localUserId || !game || !readyRef.current) {
      return;
    }
    const lt = game.lastTrade;
    if (!lt) {
      return;
    }
    const sig = lastTradeSignature(lt);
    if (sig === lastTradeSigRef.current) {
      return;
    }
    lastTradeSigRef.current = sig;
    const accepted = lt.outcome === 'accepted';
    const fromName = formatUsername(lt.fromUsername) || 'Someone';
    const toName = formatUsername(lt.toUsername) || 'Someone';
    const iProposed = lt.fromUserId === localUserId;
    const iTarget = lt.toUserId === localUserId;
    let message: string;
    if (accepted) {
      if (iProposed) {
        message = `${toName} accepted your offer`;
      } else if (iTarget) {
        message = `You accepted ${fromName}'s offer`;
      } else {
        message = `${toName} accepted ${fromName}'s offer`;
      }
    } else if (iProposed) {
      message = `${toName} rejected your offer`;
    } else if (iTarget) {
      message = `You rejected ${fromName}'s offer`;
    } else {
      message = `${toName} rejected ${fromName}'s offer`;
    }
    notify({
      type: accepted ? 'success' : 'info',
      title: accepted ? 'Offer accepted' : 'Offer rejected',
      message,
    });
  }, [enabled, game, localUserId]);

  // Phase 14.2 — debt-pay window opened: toast others.
  useEffect(() => {
    if (!enabled || !localUserId || !game || !readyRef.current) {
      return;
    }
    const dp = game.debtPay;
    if (!dp) {
      debtPaySigRef.current = null;
      return;
    }
    const sig = debtPaySignature(dp);
    if (sig === debtPaySigRef.current) {
      return;
    }
    debtPaySigRef.current = sig;
    if (dp.userId === localUserId) {
      return;
    }
    const who = formatUsername(dp.username) || 'Someone';
    notify({
      type: 'info',
      title: 'Paying debt',
      message: `${who} is paying debt`,
    });
  }, [enabled, game, localUserId]);

  // Phase 14.2 — bankruptcy wipe toast (declare / auto). Resign + turn
  // timeout already toast via resign/forfeit handlers on the board.
  useEffect(() => {
    if (!enabled || !localUserId || !game || !readyRef.current) {
      return;
    }
    const lb = game.lastBankruptcy;
    if (!lb) {
      return;
    }
    const sig = lastBankruptcySignature(lb);
    if (sig === lastBankruptcySigRef.current) {
      return;
    }
    lastBankruptcySigRef.current = sig;
    if (
      lb.reason === 'resign' ||
      lb.reason === 'turn_timeout'
    ) {
      return;
    }
    const iAm = lb.userId === localUserId;
    const who = iAm ? 'You' : formatUsername(lb.username) || 'Someone';
    let detail: string;
    switch (lb.reason) {
      case 'auto_timeout':
        detail = iAm
          ? 'You ran out of time raising funds'
          : `${who} ran out of time raising funds`;
        break;
      case 'auto_insolvent':
        detail = iAm
          ? 'You could not raise enough to settle'
          : `${who} could not raise enough to settle`;
        break;
      case 'declare':
      default:
        detail = iAm
          ? 'You declared bankruptcy'
          : `${who} declared bankruptcy`;
        break;
    }
    notify({
      type: iAm ? 'error' : 'info',
      title: 'Bankruptcy',
      message: detail,
    });
  }, [enabled, game, localUserId]);

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
