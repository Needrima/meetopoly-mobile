/**
 * Tunable board-walk constants (fractions of board or tile size).
 * Tweak here rather than hunting magic numbers in the walk hook.
 */
export const BOARD_WALK = {
  /** Avatar collision / visual radius as a fraction of board side. */
  avatarRadiusFrac: 0.016,
  /** Soft pin radius as a fraction of board side. */
  pinRadiusFrac: 0.014,
  /** Full-stick speed: board-side lengths per second. */
  speedFrac: 0.1,
  /**
   * Enter / glow proximity: fraction of the tile's short edge,
   * measured from the tile center to the avatar center.
   */
  nearbyRadiusTileFrac: 0.55,
} as const;

/** Eight classic Monopoly track colors (no violet) — avatar + pins. */
export const AVATAR_COLOR_KEYS = [
  'brown',
  'lightBlue',
  'pink',
  'orange',
  'red',
  'yellow',
  'green',
  'darkBlue',
] as const;

export type AvatarColorKey = (typeof AVATAR_COLOR_KEYS)[number];

