import type { Location } from '@/api/types';
import type { BoardSide } from '@/components/board/boardLayout';
import { colorGroups, colors } from '@/theme/colors';

const GROUP_HEX: Record<string, string> = {
  brown: colorGroups.brown,
  lightBlue: colorGroups.lightBlue,
  lightblue: colorGroups.lightBlue,
  pink: colorGroups.pink,
  orange: colorGroups.orange,
  red: colorGroups.red,
  yellow: colorGroups.yellow,
  green: colorGroups.green,
  darkBlue: colorGroups.darkBlue,
  darkblue: colorGroups.darkBlue,
  violet: colorGroups.violet,
};

export type TileVisual = {
  /** Fill behind band / full tile for non-property. */
  fill: string;
  /** Monopoly color strip (properties only). */
  bandColor: string | null;
  /** Band thickness as fraction of the short tile edge. */
  bandFraction: number;
};

/** Kind / group styling for Phase 4.2 (no icons). Corners: fill only, no band. */
export function tileVisual(
  loc: Location | undefined,
  opts?: { isCorner?: boolean },
): TileVisual {
  const base = tileVisualBase(loc);
  if (opts?.isCorner) {
    return { ...base, bandColor: null };
  }
  return base;
}

function tileVisualBase(loc: Location | undefined): TileVisual {
  if (!loc) {
    return { fill: colors.surface, bandColor: null, bandFraction: 0.22 };
  }

  if (loc.kind === 'property') {
    const band =
      (loc.colorGroup && GROUP_HEX[loc.colorGroup]) || colorGroups.brown;
    return { fill: colors.surface, bandColor: band, bandFraction: 0.22 };
  }

  if (loc.kind === 'railroad') {
    return { fill: '#E8EEF5', bandColor: colors.info, bandFraction: 0.14 };
  }

  if (loc.kind === 'utility') {
    return { fill: '#FFF6E5', bandColor: colors.accent, bandFraction: 0.14 };
  }

  switch (loc.specialType) {
    case 'go':
      return { fill: '#E4F6EA', bandColor: colors.success, bandFraction: 0.16 };
    case 'chance':
      return { fill: '#FFF4E0', bandColor: colors.warn, bandFraction: 0.16 };
    case 'community_chest':
      return { fill: '#E7F0FF', bandColor: colors.info, bandFraction: 0.16 };
    case 'jail':
    case 'go_to_jail':
      return { fill: '#ECEAE6', bandColor: colors.muted, bandFraction: 0.16 };
    case 'free_parking':
      return { fill: '#E8F4FF', bandColor: colors.info, bandFraction: 0.16 };
    case 'tax':
      return { fill: '#FCEBE8', bandColor: colors.danger, bandFraction: 0.16 };
    default:
      return { fill: colors.bg, bandColor: colors.border, bandFraction: 0.14 };
  }
}

/**
 * Color band sits on the edge toward the board center (classic Monopoly).
 */
export function bandStyle(
  side: BoardSide,
  width: number,
  height: number,
  fraction: number,
): { left: number; top: number; width: number; height: number } {
  const t = Math.max(4, Math.round(Math.min(width, height) * fraction));
  switch (side) {
    case 'bottom':
      return { left: 0, top: 0, width, height: t };
    case 'top':
      return { left: 0, top: height - t, width, height: t };
    case 'left':
      return { left: width - t, top: 0, width: t, height };
    case 'right':
      return { left: 0, top: 0, width: t, height };
  }
}
