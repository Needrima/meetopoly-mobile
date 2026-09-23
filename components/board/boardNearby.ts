import type { Location } from '@/api/types';
import { BOARD_WALK } from '@/components/board/boardConstants';
import type { BoardLayout, TileLayout } from '@/components/board/boardLayout';
import type { Vec2 } from '@/components/board/boardCollision';

const ENTERABLE = new Set(['property', 'railroad', 'utility']);

export function isEnterableLocation(loc: Location | undefined): boolean {
  return Boolean(loc && ENTERABLE.has(loc.kind));
}

export function tileCenter(tile: TileLayout): Vec2 {
  return { x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 };
}

export function nearbyRadiusForTile(tile: TileLayout): number {
  return Math.min(tile.width, tile.height) * BOARD_WALK.nearbyRadiusTileFrac;
}

/**
 * Nearest enterable tile within its proximity radius.
 * Tie-break: lower boardIndex. Specials never qualify.
 */
export function findNearestEnterable(
  pose: Vec2,
  layout: BoardLayout,
  byIndex: Map<number, Location>,
): Location | null {
  let best: Location | null = null;
  let bestDist = Infinity;
  let bestIndex = Number.POSITIVE_INFINITY;

  for (const tile of layout.tiles) {
    const loc = byIndex.get(tile.boardIndex);
    if (!isEnterableLocation(loc) || !loc) {
      continue;
    }
    const c = tileCenter(tile);
    const radius = nearbyRadiusForTile(tile);
    const dist = Math.hypot(pose.x - c.x, pose.y - c.y);
    if (dist > radius) {
      continue;
    }
    if (
      dist < bestDist ||
      (dist === bestDist && tile.boardIndex < bestIndex)
    ) {
      best = loc;
      bestDist = dist;
      bestIndex = tile.boardIndex;
    }
  }

  return best;
}
