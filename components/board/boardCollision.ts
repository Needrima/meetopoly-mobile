import type { CenterDeckLayout } from '@/components/board/boardLayout';

export type Vec2 = { x: number; y: number };

export type CircleObstacle = {
  x: number;
  y: number;
  radius: number;
  /** Soft = gentle push; hard = solid block. */
  soft?: boolean;
};

/** Ray-crossing point-in-polygon (board-local). */
export function pointInPolygon(p: Vec2, poly: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i]!.x;
    const yi = poly[i]!.y;
    const xj = poly[j]!.x;
    const yj = poly[j]!.y;
    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

function closestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-9) {
    return { x: a.x, y: a.y };
  }
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + abx * t, y: a.y + aby * t };
}

function pushFromPoint(
  pos: Vec2,
  obstacle: Vec2,
  minDist: number,
  strength: number,
): Vec2 {
  const dx = pos.x - obstacle.x;
  const dy = pos.y - obstacle.y;
  const dist = Math.hypot(dx, dy);
  if (dist >= minDist) {
    return pos;
  }
  if (dist < 1e-6) {
    return { x: pos.x + minDist * strength, y: pos.y };
  }
  const push = (minDist - dist) * strength;
  const nx = dx / dist;
  const ny = dy / dist;
  return { x: pos.x + nx * push, y: pos.y + ny * push };
}

/** Resolve circle vs rotated deck parallelogram (hard). */
export function resolveDeckCollision(
  pos: Vec2,
  radius: number,
  deck: CenterDeckLayout,
): Vec2 {
  const poly = deck.points;
  if (poly.length < 3) {
    return pos;
  }

  if (pointInPolygon(pos, poly)) {
    let cx = 0;
    let cy = 0;
    for (const p of poly) {
      cx += p.x;
      cy += p.y;
    }
    cx /= poly.length;
    cy /= poly.length;
    return pushFromPoint(pos, { x: cx, y: cy }, radius + 4, 1);
  }

  let next = pos;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const closest = closestPointOnSegment(next, a, b);
    next = pushFromPoint(next, closest, radius, 1);
  }
  return next;
}

export function resolveCircleObstacle(
  pos: Vec2,
  radius: number,
  obstacle: CircleObstacle,
): Vec2 {
  const minDist = radius + obstacle.radius;
  const strength = obstacle.soft ? 0.35 : 1;
  return pushFromPoint(pos, { x: obstacle.x, y: obstacle.y }, minDist, strength);
}

/** Keep avatar circle inside the square board. */
export function clampToBoard(pos: Vec2, radius: number, boardSize: number): Vec2 {
  return {
    x: Math.max(radius, Math.min(boardSize - radius, pos.x)),
    y: Math.max(radius, Math.min(boardSize - radius, pos.y)),
  };
}

/**
 * Apply hard (edge + decks) then soft (pins) collisions.
 * Soft runs after hard so pins never shove you through a deck.
 */
export function resolveWalkCollisions(
  proposed: Vec2,
  radius: number,
  boardSize: number,
  decks: CenterDeckLayout[],
  softObstacles: CircleObstacle[],
): Vec2 {
  let pos = clampToBoard(proposed, radius, boardSize);
  for (const deck of decks) {
    pos = resolveDeckCollision(pos, radius, deck);
  }
  pos = clampToBoard(pos, radius, boardSize);
  for (const obs of softObstacles) {
    pos = resolveCircleObstacle(pos, radius, obs);
  }
  pos = clampToBoard(pos, radius, boardSize);
  return pos;
}

/** Random spawn inside the green center, avoiding deck AABB + margin. */
export function randomCenterSpawn(
  center: { x: number; y: number; width: number; height: number },
  decks: CenterDeckLayout[],
  radius: number,
  attempts = 40,
): Vec2 {
  const pad = radius + 6;
  const minX = center.x + pad;
  const maxX = center.x + center.width - pad;
  const minY = center.y + pad;
  const maxY = center.y + center.height - pad;

  for (let i = 0; i < attempts; i += 1) {
    const p = {
      x: minX + Math.random() * Math.max(0, maxX - minX),
      y: minY + Math.random() * Math.max(0, maxY - minY),
    };
    let ok = true;
    for (const deck of decks) {
      const b = deck.bounds;
      const m = radius + 8;
      if (
        p.x > b.x - m &&
        p.x < b.x + b.width + m &&
        p.y > b.y - m &&
        p.y < b.y + b.height + m
      ) {
        ok = false;
        break;
      }
      if (pointInPolygon(p, deck.points)) {
        ok = false;
        break;
      }
    }
    if (ok) {
      return p;
    }
  }

  return {
    x: center.x + center.width / 2,
    y: center.y + center.height / 2,
  };
}
