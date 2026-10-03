import type { Game, GameDeed, Location } from '@/api/types';

export type EconomyMode = 'build' | 'sell' | 'mortgage' | 'redeem';

export type EconomyModeCopy = {
  title: string;
  body: string;
  note: string;
};

/** How-to sheet copy (Business Monopoly–style). */
export function economyModeCopy(mode: EconomyMode): EconomyModeCopy {
  switch (mode) {
    case 'build':
      return {
        title: 'Build',
        body: 'To BUILD a House or Hotel, tap on highlighted land on the board.',
        note: 'You need to own all the properties under the same coloured group in order to build. They have to be built symmetrically.',
      };
    case 'sell':
      return {
        title: 'Sell',
        body: 'To SELL a House or Hotel, tap on highlighted land on the board.',
        note: 'Buildings must be sold evenly across the colour group (tallest first).',
      };
    case 'mortgage':
      return {
        title: 'Mortgage',
        body: 'To MORTGAGE a property, tap on highlighted land on the board.',
        note: 'Cities must have no houses on the whole colour group. Payout is half the list price.',
      };
    case 'redeem':
      return {
        title: 'Redeem',
        body: 'To REDEEM a mortgaged property, tap on highlighted land on the board.',
        note: 'Cost is the mortgage value plus 10%.',
      };
  }
}

function deedMap(deeds: GameDeed[] | undefined): Map<number, GameDeed> {
  const map = new Map<number, GameDeed>();
  for (const d of deeds ?? []) {
    map.set(d.boardIndex, d);
  }
  return map;
}

function groupSpaces(
  locations: Location[],
  colorGroup: string,
): Location[] {
  return locations.filter(
    (l) =>
      l.kind === 'property' &&
      typeof l.colorGroup === 'string' &&
      l.colorGroup === colorGroup,
  );
}

function ownsFullColorGroup(
  locations: Location[],
  deeds: Map<number, GameDeed>,
  userId: string,
  colorGroup: string,
): boolean {
  const group = groupSpaces(locations, colorGroup);
  if (group.length < 2) {
    return false;
  }
  return group.every((l) => deeds.get(l.boardIndex)?.ownerUserId === userId);
}

function minHousesInGroup(
  locations: Location[],
  deeds: Map<number, GameDeed>,
  userId: string,
  colorGroup: string,
): number {
  let min = -1;
  for (const l of groupSpaces(locations, colorGroup)) {
    const d = deeds.get(l.boardIndex);
    if (!d || d.ownerUserId !== userId) {
      continue;
    }
    const h = Math.max(0, Math.min(5, d.houses ?? 0));
    if (min < 0 || h < min) {
      min = h;
    }
  }
  return min < 0 ? 0 : min;
}

function maxHousesInGroup(
  locations: Location[],
  deeds: Map<number, GameDeed>,
  userId: string,
  colorGroup: string,
): number {
  let max = 0;
  for (const l of groupSpaces(locations, colorGroup)) {
    const d = deeds.get(l.boardIndex);
    if (!d || d.ownerUserId !== userId) {
      continue;
    }
    max = Math.max(max, Math.max(0, Math.min(5, d.houses ?? 0)));
  }
  return max;
}

function groupHasMortgage(
  locations: Location[],
  deeds: Map<number, GameDeed>,
  colorGroup: string,
): boolean {
  for (const l of groupSpaces(locations, colorGroup)) {
    if (deeds.get(l.boardIndex)?.mortgaged) {
      return true;
    }
  }
  return false;
}

function groupHasBuildings(
  locations: Location[],
  deeds: Map<number, GameDeed>,
  colorGroup: string,
): boolean {
  for (const l of groupSpaces(locations, colorGroup)) {
    const h = deeds.get(l.boardIndex)?.houses ?? 0;
    if (h > 0) {
      return true;
    }
  }
  return false;
}

function mortgageValue(price: number): number {
  return Math.floor(price / 2);
}

function redeemCost(price: number): number {
  const m = mortgageValue(price);
  return m + Math.floor(m / 10);
}

export type EligibleTile = {
  boardIndex: number;
  /** Cost or payout cue for the highlight (MeetCoin). */
  amount: number;
};

/**
 * Client-side eligible tiles for the active economy mode (server still enforces).
 */
export function eligibleTilesForMode(
  mode: EconomyMode,
  game: Game,
  locations: Location[],
  userId: string,
): EligibleTile[] {
  const deeds = deedMap(game.deeds);
  const cash =
    game.players.find((p) => p.userId === userId)?.cash ?? 0;
  const pending = Boolean(
    game.pendingPayment && game.pendingPayment.amount > 0,
  );
  const out: EligibleTile[] = [];

  for (const loc of locations) {
    const d = deeds.get(loc.boardIndex);
    if (!d || d.ownerUserId !== userId) {
      continue;
    }
    const houses = Math.max(0, Math.min(5, d.houses ?? 0));
    const price = typeof loc.price === 'number' ? loc.price : 0;
    const houseCost =
      typeof loc.houseCost === 'number' ? loc.houseCost : 0;
    const colorGroup =
      typeof loc.colorGroup === 'string' ? loc.colorGroup : '';

    switch (mode) {
      case 'build': {
        if (pending) {
          break;
        }
        if (loc.kind !== 'property' || !colorGroup || houseCost <= 0) {
          break;
        }
        if (houses >= 5 || d.mortgaged) {
          break;
        }
        if (!ownsFullColorGroup(locations, deeds, userId, colorGroup)) {
          break;
        }
        if (groupHasMortgage(locations, deeds, colorGroup)) {
          break;
        }
        if (houses !== minHousesInGroup(locations, deeds, userId, colorGroup)) {
          break;
        }
        if (cash < houseCost) {
          break;
        }
        out.push({ boardIndex: loc.boardIndex, amount: houseCost });
        break;
      }
      case 'sell': {
        if (loc.kind !== 'property' || !colorGroup || houseCost <= 0) {
          break;
        }
        if (houses < 1) {
          break;
        }
        if (!ownsFullColorGroup(locations, deeds, userId, colorGroup)) {
          break;
        }
        if (houses !== maxHousesInGroup(locations, deeds, userId, colorGroup)) {
          break;
        }
        out.push({
          boardIndex: loc.boardIndex,
          amount: Math.floor(houseCost / 2),
        });
        break;
      }
      case 'mortgage': {
        if (d.mortgaged || price <= 0) {
          break;
        }
        const buyable =
          loc.kind === 'property' ||
          loc.kind === 'airport' ||
          loc.kind === 'utility';
        if (!buyable) {
          break;
        }
        if (
          loc.kind === 'property' &&
          colorGroup &&
          groupHasBuildings(locations, deeds, colorGroup)
        ) {
          break;
        }
        out.push({ boardIndex: loc.boardIndex, amount: mortgageValue(price) });
        break;
      }
      case 'redeem': {
        if (pending || !d.mortgaged || price <= 0) {
          break;
        }
        const cost = redeemCost(price);
        if (cash < cost) {
          break;
        }
        out.push({ boardIndex: loc.boardIndex, amount: cost });
        break;
      }
    }
  }

  return out;
}
