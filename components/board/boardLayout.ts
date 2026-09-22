import type { Location } from '@/api/types';

export type BoardSide = 'bottom' | 'left' | 'top' | 'right';

export type TileLayout = {
  boardIndex: number;
  side: BoardSide;
  /** Pixel rect in board-local coords (origin top-left). */
  x: number;
  y: number;
  width: number;
  height: number;
  isCorner: boolean;
};

export type BoardLayout = {
  size: number;
  trackDepth: number;
  center: { x: number; y: number; width: number; height: number };
  tiles: TileLayout[];
};

const CORNER_TYPES = ['go', 'jail', 'free_parking', 'go_to_jail'] as const;

/**
 * Resolve the four corner boardIndices in path order: GO → Jail → Free Parking → Go to Jail.
 */
export function cornerIndices(locations: Location[]): [number, number, number, number] {
  const bySpecial = new Map<string, number>();
  for (const loc of locations) {
    if (loc.kind === 'special' && loc.specialType && CORNER_TYPES.includes(loc.specialType as (typeof CORNER_TYPES)[number])) {
      bySpecial.set(loc.specialType, loc.boardIndex);
    }
  }
  const go = bySpecial.get('go');
  const jail = bySpecial.get('jail');
  const free = bySpecial.get('free_parking');
  const goto = bySpecial.get('go_to_jail');
  if (go != null && jail != null && free != null && goto != null) {
    return [go, jail, free, goto];
  }
  // Fallback: even-ish split of sorted indices (should not happen for africa-1).
  const idxs = [...new Set(locations.map((l) => l.boardIndex))].sort((a, b) => a - b);
  const n = idxs.length;
  const step = Math.floor(n / 4);
  return [idxs[0] ?? 0, idxs[step] ?? 0, idxs[step * 2] ?? 0, idxs[step * 3] ?? 0];
}

/**
 * Lay out a Monopoly-style ring inside a square of `size`.
 * GO sits bottom-right; path runs clockwise (bottom → left → top → right).
 */
export function layoutBoardRing(size: number, locations: Location[]): BoardLayout {
  const trackDepth = Math.max(28, Math.round(size * 0.132));
  const inner = size - trackDepth * 2;
  const [go, jail, free, gotoJail] = cornerIndices(locations);
  const maxIndex = Math.max(...locations.map((l) => l.boardIndex), go);

  const tiles: TileLayout[] = [];

  const pushCorner = (boardIndex: number, side: BoardSide, x: number, y: number) => {
    tiles.push({
      boardIndex,
      side,
      x,
      y,
      width: trackDepth,
      height: trackDepth,
      isCorner: true,
    });
  };

  // --- Bottom (GO → Jail): right to left ---
  pushCorner(go, 'bottom', size - trackDepth, size - trackDepth);
  {
    const mids = indicesBetween(go, jail, maxIndex);
    const midW = mids.length > 0 ? inner / mids.length : inner;
    mids.forEach((boardIndex, i) => {
      tiles.push({
        boardIndex,
        side: 'bottom',
        x: size - trackDepth - (i + 1) * midW,
        y: size - trackDepth,
        width: midW,
        height: trackDepth,
        isCorner: false,
      });
    });
  }
  pushCorner(jail, 'bottom', 0, size - trackDepth);

  // --- Left (Jail → Free Parking): bottom to top ---
  // jail corner already placed
  {
    const mids = indicesBetween(jail, free, maxIndex);
    const midH = mids.length > 0 ? inner / mids.length : inner;
    mids.forEach((boardIndex, i) => {
      tiles.push({
        boardIndex,
        side: 'left',
        x: 0,
        y: size - trackDepth - (i + 1) * midH,
        width: trackDepth,
        height: midH,
        isCorner: false,
      });
    });
  }
  pushCorner(free, 'top', 0, 0);

  // --- Top (Free Parking → Go to Jail): left to right ---
  {
    const mids = indicesBetween(free, gotoJail, maxIndex);
    const midW = mids.length > 0 ? inner / mids.length : inner;
    mids.forEach((boardIndex, i) => {
      tiles.push({
        boardIndex,
        side: 'top',
        x: trackDepth + i * midW,
        y: 0,
        width: midW,
        height: trackDepth,
        isCorner: false,
      });
    });
  }
  pushCorner(gotoJail, 'top', size - trackDepth, 0);

  // --- Right (Go to Jail → GO): top to bottom ---
  {
    const mids = indicesBetween(gotoJail, go, maxIndex);
    const midH = mids.length > 0 ? inner / mids.length : inner;
    mids.forEach((boardIndex, i) => {
      tiles.push({
        boardIndex,
        side: 'right',
        x: size - trackDepth,
        y: trackDepth + i * midH,
        width: trackDepth,
        height: midH,
        isCorner: false,
      });
    });
  }

  // Deduplicate corners that were pushed twice (jail/free/goto appear once each — go once).
  // jail was pushed as bottom corner; free as top; gotoJail as top; go as bottom.
  // Left side didn't re-push jail. Good.
  // But free was pushCorner after left mids AND we might have issue: jail pushed only once.

  return {
    size,
    trackDepth,
    center: { x: trackDepth, y: trackDepth, width: inner, height: inner },
    tiles: dedupeTiles(tiles),
  };
}

/** Indices strictly after `from` up to but not including `to` (wraps past max). */
function indicesBetween(from: number, to: number, maxIndex: number): number[] {
  const out: number[] = [];
  let i = from + 1;
  if (to > from) {
    while (i < to) {
      out.push(i);
      i += 1;
    }
    return out;
  }
  // wrap: e.g. 34 → 0 with max 40 → 35..40
  while (i <= maxIndex) {
    out.push(i);
    i += 1;
  }
  i = 0;
  while (i < to) {
    out.push(i);
    i += 1;
  }
  return out;
}

function dedupeTiles(tiles: TileLayout[]): TileLayout[] {
  const seen = new Set<number>();
  const out: TileLayout[] = [];
  for (const t of tiles) {
    if (seen.has(t.boardIndex)) {
      continue;
    }
    seen.add(t.boardIndex);
    out.push(t);
  }
  return out;
}
