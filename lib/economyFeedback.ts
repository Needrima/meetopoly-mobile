import type {
  Game,
  GameDeed,
  GameLastCard,
  GameLastPayment,
  GamePlayer,
  Location,
} from '@/api/types';
import { buyToastTitle, countOwnedOfKind } from '@/lib/buyToast';
import { formatUsername } from '@/lib/formatUsername';
import { usernameInitials } from '@/hooks/useBoardWalk';
import { stripWorldNamePrefix } from '@/components/board/deedVisual';
import { colors } from '@/theme/colors';

/** Board economy celebration duration — longer in __DEV__ for playtesting. */
export const ECONOMY_MODAL_MS = __DEV__ ? 5000 : 3000;

/** Chance/Chest top-card fly-off before the reveal modal. */
export const DECK_DRAW_FLY_MS = 520;

/** Pin hold on Chance/Chest tile = fly-off + modal. */
export const CARD_REVEAL_HOLD_MS = DECK_DRAW_FLY_MS + ECONOMY_MODAL_MS;

/** Classic Jail / Just Visiting index (seed `specialType: jail`). */
export const JAIL_BOARD_INDEX = 10;

export type EconomyBuyEvent = {
  kind: 'buy';
  title: 'LAND BOUGHT' | 'AIRPORT BOUGHT' | 'UTILITY BOUGHT';
  location: Location;
  price: number;
  /** Real username for avatar initials (not "You"). */
  buyerUsername: string;
  buyerInitials: string;
  buyerPinColor: string;
  /** Toast / hub copy. */
  toastTitle: string;
  toastMessage: string;
};

export type EconomyRentEvent = {
  kind: 'rent';
  amount: number;
  place: string;
  fromUsername: string;
  toUsername: string;
  fromInitials: string;
  toInitials: string;
  fromPinColor: string;
  toPinColor: string;
  paidInFull: boolean;
  toastTitle: string;
  toastMessage: string;
};

export type EconomyTaxEvent = {
  kind: 'tax';
  amount: number;
  place: string;
  fromUsername: string;
  fromInitials: string;
  fromPinColor: string;
  paidInFull: boolean;
  toastTitle: string;
  toastMessage: string;
};

export type EconomySalaryEvent = {
  kind: 'salary';
  amount: number;
  passerUsername: string;
  toastTitle: string;
  toastMessage: string;
};

/** Phase 12.4 — Chance / Community Chest reveal. */
export type EconomyCardEvent = {
  kind: 'card';
  deck: 'chance' | 'community_chest';
  cardId: string;
  title: string;
  /** Signed MeetCoin for drawer net; 0 = hide amount line. */
  cashDelta: number;
  drawerUsername: string;
  drawerInitials: string;
  drawerPinColor: string;
  toastTitle: string;
  toastMessage: string;
};

/** Phase 12.4 — landed on Jail as Just Visiting. */
export type EconomyJustVisitingEvent = {
  kind: 'just_visiting';
  visitorUsername: string;
  visitorInitials: string;
  visitorPinColor: string;
  toastTitle: string;
  toastMessage: string;
};

/** Phase 12.4 — left Jail (toast for table). */
export type EconomyJailExitEvent = {
  kind: 'jail_exit';
  reason: 'fine' | 'card' | 'doubles';
  actorUsername: string;
  toastTitle: string;
  toastMessage: string;
};

/** Phase 12.4b — failed doubles try while still in Jail. */
export type EconomyJailDoublesFailEvent = {
  kind: 'jail_doubles_fail';
  actorUsername: string;
  attemptsLeft: number;
  toastTitle: string;
  toastMessage: string;
};

export type EconomyEvent =
  | EconomyBuyEvent
  | EconomyRentEvent
  | EconomyTaxEvent
  | EconomySalaryEvent
  | EconomyCardEvent
  | EconomyJustVisitingEvent
  | EconomyJailExitEvent
  | EconomyJailDoublesFailEvent;

export function buyModalTitle(
  locKind: Location['kind'] | undefined,
): EconomyBuyEvent['title'] {
  if (locKind === 'railroad') {
    return 'AIRPORT BOUGHT';
  }
  if (locKind === 'utility') {
    return 'UTILITY BOUGHT';
  }
  return 'LAND BOUGHT';
}

export function pinColorForPlayer(
  players: GamePlayer[] | undefined,
  userId: string | undefined | null,
  localUserId: string | null,
  displayAccent: string | null | undefined,
  fallback = colors.muted,
): string {
  if (!userId || !players) {
    return fallback;
  }
  const p = players.find((x) => x.userId === userId);
  if (!p) {
    return fallback;
  }
  if (localUserId && p.userId === localUserId && displayAccent) {
    return displayAccent;
  }
  return p.pinColor || fallback;
}

export function buildBuyEvent(args: {
  deed: GameDeed;
  location: Location | undefined;
  locations: Location[];
  deeds: GameDeed[];
  localUserId: string | null;
  players: GamePlayer[] | undefined;
  displayAccent?: string | null;
  /** Phase 13.1 — when set, modal shows auction settle price. */
  priceOverride?: number | null;
}): EconomyBuyEvent {
  const {
    deed,
    location,
    locations,
    deeds,
    localUserId,
    players,
    displayAccent,
    priceOverride = null,
  } = args;
  const iBought = Boolean(localUserId && deed.ownerUserId === localUserId);
  const ownedOfKind = countOwnedOfKind(
    deeds,
    locations,
    deed.ownerUserId,
    location?.kind,
  );
  const place = stripWorldNamePrefix(
    location?.name ?? `space ${deed.boardIndex}`,
  );
  const price =
    priceOverride != null && priceOverride >= 0
      ? priceOverride
      : (location?.price ?? 0);
  const buyerName = formatUsername(deed.ownerUsername) || 'Someone';
  const loc: Location =
    location ??
    ({
      id: '',
      worldId: '',
      slug: '',
      name: place,
      kind: 'property',
      boardIndex: deed.boardIndex,
      boardCode: '',
      price: 0,
    } as Location);
  return {
    kind: 'buy',
    title: buyModalTitle(location?.kind),
    location: loc,
    price,
    buyerUsername: buyerName,
    buyerInitials: usernameInitials(buyerName),
    buyerPinColor: pinColorForPlayer(
      players,
      deed.ownerUserId,
      localUserId,
      displayAccent,
    ),
    toastTitle: buyToastTitle({
      kind: location?.kind,
      iBought,
      ownerUsername: deed.ownerUsername,
      ownedOfKind,
    }),
    toastMessage: `${place}${price > 0 ? ` · ${price}` : ''}`,
  };
}

export function lastAuctionSignature(
  la: { boardIndex: number; winnerUserId?: string; amount?: number; void: boolean } | null | undefined,
): string {
  if (!la) {
    return '';
  }
  return `${la.boardIndex}:${la.winnerUserId ?? ''}:${la.amount ?? 0}:${la.void ? 1 : 0}`;
}

export function lastTradeSignature(
  lt:
    | {
        fromUserId: string;
        toUserId: string;
        outcome: string;
        settledAt?: string;
      }
    | null
    | undefined,
): string {
  if (!lt) {
    return '';
  }
  return `${lt.fromUserId}:${lt.toUserId}:${lt.outcome}:${lt.settledAt ?? ''}`;
}

export function openTradeSignature(
  trade:
    | {
        fromUserId: string;
        toUserId: string;
        replyDeadline: string;
      }
    | null
    | undefined,
): string {
  if (!trade) {
    return '';
  }
  return `${trade.fromUserId}:${trade.toUserId}:${trade.replyDeadline}`;
}

export function buildPaymentEvent(args: {
  payment: GameLastPayment;
  localUserId: string | null;
  players: GamePlayer[] | undefined;
  displayAccent?: string | null;
}): EconomyRentEvent | EconomyTaxEvent | null {
  const { payment: p, localUserId, players, displayAccent } = args;
  // Jail fine / card cash: handled as card / jail_exit events (Phase 12.4).
  if (p.kind === 'jail_fine' || p.kind === 'card') {
    return null;
  }
  const place = stripWorldNamePrefix(p.spaceName || `space ${p.boardIndex}`);
  const iPaid = Boolean(localUserId && p.fromUserId === localUserId);
  const received = Boolean(localUserId && p.toUserId === localUserId);
  const fromName = formatUsername(p.fromUsername) || 'Someone';
  const toName = formatUsername(p.toUsername) || 'owner';

  if (p.kind === 'tax') {
    return {
      kind: 'tax',
      amount: p.amount,
      place,
      fromUsername: iPaid ? 'You' : fromName,
      fromInitials: usernameInitials(fromName),
      fromPinColor: pinColorForPlayer(
        players,
        p.fromUserId,
        localUserId,
        displayAccent,
      ),
      paidInFull: p.paidInFull,
      toastTitle: iPaid ? 'Tax paid' : 'Tax collected',
      toastMessage: iPaid
        ? `−${p.amount} · ${place}`
        : `${fromName} paid ${p.amount} tax · ${place}`,
    };
  }

  return {
    kind: 'rent',
    amount: p.amount,
    place,
    fromUsername: iPaid ? 'You' : fromName,
    toUsername: received ? 'You' : toName,
    fromInitials: usernameInitials(fromName),
    toInitials: usernameInitials(toName),
    fromPinColor: pinColorForPlayer(
      players,
      p.fromUserId,
      localUserId,
      displayAccent,
    ),
    toPinColor: pinColorForPlayer(
      players,
      p.toUserId,
      localUserId,
      displayAccent,
    ),
    paidInFull: p.paidInFull,
    toastTitle: iPaid ? 'Rent paid' : received ? 'Rent collected' : 'Rent paid',
    toastMessage: iPaid
      ? `You paid ${p.amount} rent · ${place}`
      : received
        ? `+${p.amount} from ${fromName} · ${place}`
        : `${fromName} → ${toName} · ${p.amount} · ${place}`,
  };
}

export function buildSalaryEvent(args: {
  amount: number;
  username: string;
  localUserId: string | null;
  passerUserId: string;
}): EconomySalaryEvent {
  const iPassed = Boolean(args.localUserId && args.passerUserId === args.localUserId);
  const name = formatUsername(args.username) || 'Someone';
  return {
    kind: 'salary',
    amount: args.amount,
    passerUsername: iPassed ? 'You' : name,
    toastTitle: 'Passed GO',
    toastMessage: iPassed
      ? `+${args.amount} MeetCoin`
      : `${name} +${args.amount} MeetCoin`,
  };
}

export function isBuyInvolved(
  localUserId: string | null,
  ownerUserId: string,
): boolean {
  return Boolean(localUserId && ownerUserId === localUserId);
}

export function isRentInvolved(
  localUserId: string | null,
  fromUserId: string,
  toUserId: string | undefined,
): boolean {
  if (!localUserId) {
    return false;
  }
  return localUserId === fromUserId || localUserId === toUserId;
}

export function isTaxInvolved(
  localUserId: string | null,
  fromUserId: string,
): boolean {
  return Boolean(localUserId && localUserId === fromUserId);
}

export function isSalaryInvolved(
  localUserId: string | null,
  passerUserId: string,
): boolean {
  return Boolean(localUserId && localUserId === passerUserId);
}

/** Board: drawer sees card modal; others toast. Hub: toast only. */
export function isCardDrawerOnBoard(
  surface: 'board' | 'hub',
  localUserId: string | null,
  drawerUserId: string,
): boolean {
  return (
    surface === 'board' &&
    Boolean(localUserId && localUserId === drawerUserId)
  );
}

export function isJustVisitingInvolved(
  localUserId: string | null,
  visitorUserId: string,
): boolean {
  return Boolean(localUserId && localUserId === visitorUserId);
}

export function buildCardEvent(args: {
  card: GameLastCard;
  localUserId: string | null;
  players: GamePlayer[] | undefined;
  displayAccent?: string | null;
}): EconomyCardEvent {
  const { card, localUserId, players, displayAccent } = args;
  const iDrew = Boolean(localUserId && card.userId === localUserId);
  const name = formatUsername(card.username) || 'Someone';
  const cashDelta = card.cashDelta ?? 0;
  const amountLine =
    cashDelta === 0
      ? ''
      : cashDelta > 0
        ? ` +${cashDelta} MeetCoin`
        : ` −${Math.abs(cashDelta)} MeetCoin`;
  const toastTitle =
    card.deck === 'chance'
      ? `${name} took a Chance`
      : `${name} opened a Chest`;
  return {
    kind: 'card',
    deck: card.deck,
    cardId: card.cardId,
    title: card.title,
    cashDelta,
    drawerUsername: iDrew ? 'You' : name,
    drawerInitials: usernameInitials(name),
    drawerPinColor: pinColorForPlayer(
      players,
      card.userId,
      localUserId,
      displayAccent,
    ),
    toastTitle,
    toastMessage: `${card.title}${amountLine}`,
  };
}

export function buildJustVisitingEvent(args: {
  username: string;
  userId: string;
  localUserId: string | null;
  players: GamePlayer[] | undefined;
  displayAccent?: string | null;
}): EconomyJustVisitingEvent {
  const iVisit = Boolean(args.localUserId && args.userId === args.localUserId);
  const name = formatUsername(args.username) || 'Someone';
  return {
    kind: 'just_visiting',
    visitorUsername: iVisit ? 'You' : name,
    visitorInitials: usernameInitials(name),
    visitorPinColor: pinColorForPlayer(
      args.players,
      args.userId,
      args.localUserId,
      args.displayAccent,
    ),
    toastTitle: 'Just Visiting',
    toastMessage: iVisit ? 'Jail — Just Visiting' : `${name} is Just Visiting`,
  };
}

export function buildJailExitEvent(args: {
  reason: EconomyJailExitEvent['reason'];
  username: string;
  localUserId: string | null;
  userId: string;
}): EconomyJailExitEvent {
  const iActed = Boolean(args.localUserId && args.userId === args.localUserId);
  const name = formatUsername(args.username) || 'Someone';
  const who = iActed ? 'You' : name;
  if (args.reason === 'fine') {
    return {
      kind: 'jail_exit',
      reason: 'fine',
      actorUsername: who,
      toastTitle: 'Left Jail',
      toastMessage: iActed
        ? 'Paid 100 MeetCoin fine'
        : `${name} paid 100 to leave Jail`,
    };
  }
  if (args.reason === 'card') {
    return {
      kind: 'jail_exit',
      reason: 'card',
      actorUsername: who,
      toastTitle: 'Left Jail',
      toastMessage: iActed
        ? 'Used Get Out of Jail Free'
        : `${name} used Get Out of Jail Free`,
    };
  }
  return {
    kind: 'jail_exit',
    reason: 'doubles',
    actorUsername: who,
    toastTitle: 'Left Jail',
    toastMessage: iActed
      ? 'Rolled doubles — free!'
      : `${name} rolled doubles out of Jail`,
  };
}

export function buildJailDoublesFailEvent(args: {
  username: string;
  localUserId: string | null;
  userId: string;
  jailTurns: number;
}): EconomyJailDoublesFailEvent {
  const iActed = Boolean(args.localUserId && args.userId === args.localUserId);
  const name = formatUsername(args.username) || 'Someone';
  const who = iActed ? 'You' : name;
  const attemptsLeft = Math.max(0, 3 - args.jailTurns);
  const tryWord = attemptsLeft === 1 ? 'try' : 'tries';
  return {
    kind: 'jail_doubles_fail',
    actorUsername: who,
    attemptsLeft,
    toastTitle: 'Still in Jail',
    toastMessage:
      attemptsLeft > 0
        ? iActed
          ? `No doubles. ${attemptsLeft} ${tryWord} left`
          : `${name} rolled. no doubles (${attemptsLeft} ${tryWord} left)`
        : iActed
          ? 'No doubles on the last try'
          : `${name} rolled. no doubles`,
  };
}

export function jailBoardIndex(locations: Location[]): number {
  const jail = locations.find(
    (l) => l.kind === 'special' && l.specialType === 'jail',
  );
  return jail?.boardIndex ?? JAIL_BOARD_INDEX;
}

/**
 * Stable id for a Chance/Chest draw.
 *
 * Key off card fields only. `lastCard` persists until the next draw — do NOT
 * mix in `currentTurn` or `lastRoll` (turn advance / next roll would re-fire
 * the same sticky card). Card move effects rewrite `toIndex` only.
 *
 * Same deck+cardId+userId drawn twice in a row (reshuffle) is an accepted
 * rare miss until the server adds a draw sequence.
 */
export function lastCardSignature(card: GameLastCard): string {
  return `${card.deck}:${card.cardId}:${card.userId}`;
}

export function jailStatusSignature(players: GamePlayer[]): string {
  return players
    .map((p) => `${p.userId}:${p.inJail ? 1 : 0}:${p.getOutOfJailFree}`)
    .sort()
    .join('|');
}

export function deedsSignature(game: Game | null): string {
  return (game?.deeds ?? [])
    .map((d) => `${d.boardIndex}:${d.ownerUserId}`)
    .sort()
    .join('|');
}

export function paymentSignature(p: GameLastPayment): string {
  return `${p.kind}:${p.fromUserId}:${p.toUserId ?? ''}:${p.amount}:${p.boardIndex}:${p.paidInFull}`;
}

export function passGoSignature(roll: {
  userId: string;
  fromIndex: number;
  toIndex: number;
  total: number;
}): string {
  return `${roll.userId}:${roll.fromIndex}:${roll.toIndex}:${roll.total}`;
}
