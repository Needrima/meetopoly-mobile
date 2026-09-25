import { AVATAR_COLOR_KEYS } from '@/components/board/boardConstants';
import { colorGroups, colors } from '@/theme/colors';

/** Min Euclidean RGB distance (0–441) before an accent is treated as clashing with the floor. */
const MIN_DIST = 95;

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace('#', '');
  if (h.length < 6) {
    return null;
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) {
    return null;
  }
  return { r, g, b };
}

function rgbDistance(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function clashesWithFloor(accent: string, floorColor: string): boolean {
  const a = parseHex(accent);
  const f = parseHex(floorColor);
  if (!a || !f) {
    return false;
  }
  return rgbDistance(a, f) < MIN_DIST;
}

function hashSalt(salt: string): number {
  let h = 2166136261;
  for (let i = 0; i < salt.length; i++) {
    h ^= salt.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const FALLBACK_PALETTE: string[] = [
  ...AVATAR_COLOR_KEYS.map((k) => colorGroups[k]),
  colors.brand,
  colors.accent,
  colors.ink,
  '#FFFFFF',
  '#111111',
];

/**
 * Pick an avatar accent that stays readable on the hub floor color.
 * Keeps `preferred` when it already contrasts; otherwise chooses a palette
 * color (stable per `salt`, e.g. userId) that does not blend with the floor.
 */
export function accentAgainstFloor(
  preferred: string,
  floorColor: string,
  salt = '',
): string {
  const pref = preferred?.trim() || colors.muted;
  if (!clashesWithFloor(pref, floorColor)) {
    return pref;
  }
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const c of [pref, ...FALLBACK_PALETTE]) {
    const key = c.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (!clashesWithFloor(c, floorColor)) {
      candidates.push(c);
    }
  }
  if (candidates.length === 0) {
    return isLightFloor(floorColor) ? colors.ink : '#FFFFFF';
  }
  if (!salt) {
    return candidates[0]!;
  }
  return candidates[hashSalt(salt) % candidates.length]!;
}

function isLightFloor(floorColor: string): boolean {
  const f = parseHex(floorColor);
  if (!f) {
    return false;
  }
  return (0.2126 * f.r + 0.7152 * f.g + 0.0722 * f.b) / 255 > 0.65;
}
