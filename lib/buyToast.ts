import type { Location } from '@/api/types';
import type { GameDeed } from '@/api/types';
import { formatUsername } from '@/lib/formatUsername';

type BuyToastArgs = {
  kind: Location['kind'] | undefined;
  iBought: boolean;
  ownerUsername: string;
  /** How many deeds of this kind the buyer owns after this purchase. */
  ownedOfKind: number;
};

/**
 * Buy-notification title. Message stays the location name.
 */
export function buyToastTitle({
  kind,
  iBought,
  ownerUsername,
  ownedOfKind,
}: BuyToastArgs): string {
  const name = formatUsername(ownerUsername) || 'Someone';
  const n = Math.max(1, ownedOfKind);

  if (kind === 'railroad') {
    const noun = n === 1 ? 'airport' : 'airports';
    return iBought
      ? `You now own ${n} ${noun}`
      : `${name} now owns ${n} ${noun}`;
  }
  if (kind === 'utility') {
    const noun = n === 1 ? 'utility' : 'utilities';
    return iBought
      ? `You now own ${n} ${noun}`
      : `${name} now owns ${n} ${noun}`;
  }
  // Cities (property) and unknown → city wording.
  return iBought
    ? 'You bought a land in a city'
    : `${name} bought a land in a city`;
}

/** Count deeds of the same kind owned by `ownerUserId`. */
export function countOwnedOfKind(
  deeds: GameDeed[],
  locations: Location[],
  ownerUserId: string,
  kind: Location['kind'] | undefined,
): number {
  if (!kind) {
    return 0;
  }
  let n = 0;
  for (const d of deeds) {
    if (d.ownerUserId !== ownerUserId) {
      continue;
    }
    const loc = locations.find((l) => l.boardIndex === d.boardIndex);
    if (loc?.kind === kind) {
      n += 1;
    }
  }
  return n;
}
