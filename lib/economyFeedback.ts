import type { Game, GameDeed, GameLastPayment, GamePlayer, Location } from '@/api/types';
import { buyToastTitle, countOwnedOfKind } from '@/lib/buyToast';
import { formatUsername } from '@/lib/formatUsername';
import { usernameInitials } from '@/hooks/useBoardWalk';
import { stripWorldNamePrefix } from '@/components/board/deedVisual';
import { colors } from '@/theme/colors';

/** Board economy celebration duration — longer in __DEV__ for playtesting. */
export const ECONOMY_MODAL_MS = __DEV__ ? 5000 : 3000;

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

export type EconomyEvent =
  | EconomyBuyEvent
  | EconomyRentEvent
  | EconomyTaxEvent
  | EconomySalaryEvent;

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
}): EconomyBuyEvent {
  const { deed, location, locations, deeds, localUserId, players, displayAccent } =
    args;
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
  const price = location?.price ?? 0;
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

export function buildPaymentEvent(args: {
  payment: GameLastPayment;
  localUserId: string | null;
  players: GamePlayer[] | undefined;
  displayAccent?: string | null;
}): EconomyRentEvent | EconomyTaxEvent | null {
  const { payment: p, localUserId, players, displayAccent } = args;
  // Jail fine toast/modal → Phase 12.4; do not mis-label as rent.
  if (p.kind === 'jail_fine') {
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
