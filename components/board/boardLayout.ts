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

/** Hard obstacle for walk (Phase 4.5+). Points are board-local. */
export type CenterDeckLayout = {
  id: 'chance' | 'community_chest';
  label: string;
  /** Parallelogram corners (clockwise), board-local. */
  points: Array<{ x: number; y: number }>;
  /** Axis-aligned bounds — coarse collide reserved for 4.5. */
  bounds: { x: number; y: number; width: number; height: number };
  fill: string;
  stroke: string;
};

export type BoardLayout = {
  size: number;
  trackDepth: number;
  center: { x: number; y: number; width: number; height: number };
  tiles: TileLayout[];
  /** Center Chance + Chest decks (hard obstacles when walking). */
  decks: CenterDeckLayout[];
};

const CORNER_TYPES = ['go', 'jail', 'free_parking', 'go_to_jail'] as const;

/**
 * Resolve the four corner boardIndices in path order: GO → Jail → Free Parking → Go to Jail.
 */
export function cornerIndices(locations: Location[]): [number, number, number, number] {
  const bySpecial = new Map<string, number>();
  for (const loc of locations) {
    if (
      loc.kind === 'special' &&
      loc.specialType &&
      CORNER_TYPES.includes(loc.specialType as (typeof CORNER_TYPES)[number])
    ) {
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

  const center = { x: trackDepth, y: trackDepth, width: inner, height: inner };

  return {
    size,
    trackDepth,
    center,
    tiles: dedupeTiles(tiles),
    decks: layoutCenterDecks(center),
  };
}

/** Shared with BoardCenter label tilt. */
export const CENTER_DECK_ROTATION_DEG = -45;

/**
 * Classic-style Chance + Community Chest decks in the board center.
 * Geometry reserved as hard obstacles for avatar walk (4.5).
 */
export function layoutCenterDecks(center: {
  x: number;
  y: number;
  width: number;
  height: number;
}): CenterDeckLayout[] {
  const { x, y, width: w, height: h } = center;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const m = Math.min(w, h);
  const deckW = m * 0.3;
  const deckH = m * 0.17;
  const offset = m * 0.2;
  const rotation = CENTER_DECK_ROTATION_DEG;

  return [
    makeDeck({
      id: 'community_chest',
      label: 'Community Chest',
      cx: cx - offset,
      cy: cy - offset,
      deckW,
      deckH,
      rotationDeg: rotation,
      fill: '#D6E6FF',
      stroke: '#2F6FED',
    }),
    makeDeck({
      id: 'chance',
      label: 'Chance',
      cx: cx + offset,
      cy: cy + offset,
      deckW,
      deckH,
      rotationDeg: rotation,
      fill: '#FFE8C2',
      stroke: '#C47A0A',
    }),
  ];
}

function makeDeck(opts: {
  id: 'chance' | 'community_chest';
  label: string;
  cx: number;
  cy: number;
  deckW: number;
  deckH: number;
  rotationDeg: number;
  fill: string;
  stroke: string;
}): CenterDeckLayout {
  const hw = opts.deckW / 2;
  const hh = opts.deckH / 2;
  const local = [
    { x: opts.cx - hw, y: opts.cy - hh },
    { x: opts.cx + hw, y: opts.cy - hh },
    { x: opts.cx + hw, y: opts.cy + hh },
    { x: opts.cx - hw, y: opts.cy + hh },
  ];
  const points = local.map((p) =>
    rotatePoint(p.x, p.y, opts.cx, opts.cy, opts.rotationDeg),
  );
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    id: opts.id,
    label: opts.label,
    points,
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    fill: opts.fill,
    stroke: opts.stroke,
  };
}

function rotatePoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  deg: number,
): { x: number; y: number } {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const dx = px - cx;
  const dy = py - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

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
