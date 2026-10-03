import { colors } from "@/theme/colors";

/** Min Euclidean RGB distance before cell bg is treated as clashing with avatar accent. */
const MIN_DIST = 95;

/**
 * Deeper / muted fills for hub roster tiles — not the Monopoly track palette
 * (those stay on AvatarPods).
 */
export const HUB_ROSTER_CELL_BG = [
  "#1A3A4A", // deep slate-teal
  "#3D1F3A", // wine
  "#1E3D2F", // forest
  "#2C2A4A", // indigo
  "#4A2C1A", // cocoa
  "#1A2F4A", // navy
  "#3A2A1A", // umber
  "#2A3A2A", // olive
  "#4A1F2E", // raspberry
  "#1F2A3A", // steel
  "#2E1F4A", // plum
  "#1A4040", // teal
] as const;

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace("#", "");
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

function clashes(accent: string, bg: string): boolean {
  const a = parseHex(accent);
  const b = parseHex(bg);
  if (!a || !b) {
    return false;
  }
  return rgbDistance(a, b) < MIN_DIST;
}

function hashSalt(salt: string): number {
  let h = 2166136261;
  for (let i = 0; i < salt.length; i++) {
    h ^= salt.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function isLightBg(bg: string): boolean {
  const f = parseHex(bg);
  if (!f) {
    return false;
  }
  return (0.2126 * f.r + 0.7152 * f.g + 0.0722 * f.b) / 255 > 0.62;
}

export type HubRosterCellColors = {
  backgroundColor: string;
  labelColor: string;
};

/**
 * Stable per-user roster cell fill that contrasts with the avatar accent.
 * Label ink flips for light backgrounds.
 */
export function rosterCellColors(
  userId: string,
  accent: string,
): HubRosterCellColors {
  const salt = userId.trim() || "anon";
  const preferred = accent?.trim() || colors.muted;
  const candidates = HUB_ROSTER_CELL_BG.filter((bg) => !clashes(preferred, bg));
  const pool =
    candidates.length > 0 ? candidates : ([...HUB_ROSTER_CELL_BG] as string[]);
  const bg = pool[hashSalt(salt) % pool.length]!;
  return {
    backgroundColor: bg,
    labelColor: isLightBg(bg) ? colors.ink : colors.onBrand,
  };
}
