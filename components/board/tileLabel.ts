import type { Location } from "@/api/types";
import type { BoardSide } from "@/components/board/boardLayout";

/**
 * Tile label: prefer API boardCode; keep a few corner phrases readable.
 */
export function shortTileName(loc: Location | undefined): string {
  if (!loc) {
    return "";
  }
  if (loc.kind === "special") {
    switch (loc.specialType) {
      case "go":
        return "GO";
      case "jail":
        return "Jail";
      case "free_parking":
        return "Layover";
      case "go_to_jail":
        return "Go to Jail";
      default:
        break;
    }
  }
  if (loc.boardCode) {
    return loc.boardCode;
  }
  return loc.name.slice(0, 3).toUpperCase();
}

/**
 * Bottom + top: upright (icon above label).
 * Left / right: face board center.
 */
export function contentRotation(side: BoardSide): string {
  switch (side) {
    case "bottom":
    case "top":
      return "0deg";
    case "left":
      return "90deg";
    case "right":
      return "-90deg";
  }
}

/**
 * Plane icon extra rotation (after contentRotation).
 * Default plane-tilt points upper-right (NE).
 * Top → upper-left; left → upper-right on screen.
 */
export function planeIconRotation(side: BoardSide): string {
  switch (side) {
    case "left":
      return "-90deg";
    case "top":
      return "-90deg";
    case "bottom":
    case "right":
      return "0deg";
  }
}

/** GO arrow faces play direction (counter-clockwise → left from GO). */
export function isGoArrowIcon(iconPath: string | undefined | null): boolean {
  return Boolean(iconPath?.includes("arrow-narrow-right"));
}

/** Corner labels long enough to need a slightly smaller font. */
export function locLongCornerLabel(loc: Location | undefined): boolean {
  return loc?.specialType === "go_to_jail";
}

/** Same base size on every side; only “Go to Jail” may shrink slightly. */
export function labelFontSize(
  loc: Location | undefined,
  isCorner: boolean,
  minEdge: number,
): number {
  const base = minEdge < 36 ? 7 : 8;
  if (locLongCornerLabel(loc) && isCorner) {
    return Math.max(6, base - 1);
  }
  return base;
}
