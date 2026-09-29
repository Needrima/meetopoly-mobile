import type { Game, GameDeed, GameTrade, Location } from '@/api/types';
import { stripWorldNamePrefix } from '@/components/board/deedVisual';

export function mortgageValue(price: number): number {
  return Math.floor(price / 2);
}

export function redeemCost(price: number): number {
  const m = mortgageValue(price);
  return m + Math.floor(m / 10);
}

export type TradeDeedRow = {
  boardIndex: number;
  name: string;
  kind: string;
  houses: number;
  mortgaged: boolean;
  /** True when houses > 0 — cannot include in trade. */
  blocked: boolean;
  listPrice: number;
};

export function deedsForUser(
  game: Game,
  userId: string,
  locations: Location[],
): TradeDeedRow[] {
  const byIndex = new Map(locations.map((l) => [l.boardIndex, l]));
  const out: TradeDeedRow[] = [];
  for (const d of game.deeds ?? []) {
    if (d.ownerUserId !== userId) {
      continue;
    }
    const loc = byIndex.get(d.boardIndex);
    const houses = Math.max(0, d.houses ?? 0);
    out.push({
      boardIndex: d.boardIndex,
      name: stripWorldNamePrefix(loc?.name ?? `Tile ${d.boardIndex}`),
      kind: loc?.kind ?? 'property',
      houses,
      mortgaged: Boolean(d.mortgaged),
      blocked: houses > 0,
      listPrice: typeof loc?.price === 'number' ? loc.price : 0,
    });
  }
  out.sort((a, b) => a.boardIndex - b.boardIndex);
  return out;
}

export function tradeHasMortgagedDeeds(
  trade: GameTrade,
  deeds: GameDeed[],
): boolean {
  const byIndex = new Map(deeds.map((d) => [d.boardIndex, d]));
  for (const bi of [...(trade.give.boardIndexes ?? []), ...(trade.take.boardIndexes ?? [])]) {
    if (byIndex.get(bi)?.mortgaged) {
      return true;
    }
  }
  return false;
}

function redeemSumForIndexes(
  indexes: number[],
  deeds: GameDeed[],
  locations: Location[],
): number {
  const byDeed = new Map(deeds.map((d) => [d.boardIndex, d]));
  const byLoc = new Map(locations.map((l) => [l.boardIndex, l]));
  let total = 0;
  for (const bi of indexes) {
    const d = byDeed.get(bi);
    if (!d?.mortgaged) {
      continue;
    }
    const price = byLoc.get(bi)?.price;
    if (typeof price === 'number') {
      total += redeemCost(price);
    }
  }
  return total;
}

/** Redeem costs if acceptor chooses redeem_all (you = give side; partner = take side). */
export function acceptRedeemCosts(
  trade: GameTrade,
  deeds: GameDeed[],
  locations: Location[],
): { youPay: number; partnerPays: number } {
  return {
    youPay: redeemSumForIndexes(trade.give.boardIndexes ?? [], deeds, locations),
    partnerPays: redeemSumForIndexes(
      trade.take.boardIndexes ?? [],
      deeds,
      locations,
    ),
  };
}

/** Both sides non-empty and not cash-only (matches server). */
export function canSubmitTrade(give: {
  cash: number;
  boardIndexes: number[];
  getOutOfJailFree: number;
}, take: {
  cash: number;
  boardIndexes: number[];
  getOutOfJailFree: number;
}): boolean {
  const giveEmpty =
    give.cash <= 0 &&
    give.boardIndexes.length === 0 &&
    give.getOutOfJailFree <= 0;
  const takeEmpty =
    take.cash <= 0 &&
    take.boardIndexes.length === 0 &&
    take.getOutOfJailFree <= 0;
  if (giveEmpty || takeEmpty) {
    return false;
  }
  const giveAsset =
    give.boardIndexes.length > 0 || give.getOutOfJailFree > 0;
  const takeAsset =
    take.boardIndexes.length > 0 || take.getOutOfJailFree > 0;
  return giveAsset || takeAsset;
}

export function parseCashDigits(raw: string): number {
  const n = Number.parseInt(raw.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}
