import type { TileLayout } from '@/components/board/boardLayout';
import type { Vec2 } from '@/components/board/boardCollision';
import {
  AVATAR_COLOR_KEYS,
  type AvatarColorKey,
} from '@/components/board/boardConstants';
import { colorGroups } from '@/theme/colors';

/** Extra fake pins on GO in __DEV__ (local player pin is separate). */
export const DEBUG_GO_PIN_COUNT = 3;

export type BoardPinModel = {
  id: string;
  x: number;
  y: number;
  radius: number;
  accent: string;
  /** True for local player's rules pin. */
  isLocal?: boolean;
};

/**
 * Fan offsets around a tile center so stacked pins stay readable.
 * Spacing scales with pin radius.
 */
export function pinFanOffsets(count: number, spacing: number): Vec2[] {
  if (count <= 0) {
    return [];
  }
  if (count === 1) {
    return [{ x: 0, y: 0 }];
  }
  const out: Vec2[] = [];
  for (let i = 0; i < count; i += 1) {
    const a = (Math.PI * 2 * i) / count - Math.PI / 2;
    out.push({
      x: Math.cos(a) * spacing,
      y: Math.sin(a) * spacing,
    });
  }
  return out;
}

/** Monopoly colors for debug pins, skipping the local player's accent. */
export function debugPinAccents(excludeKey: AvatarColorKey): string[] {
  const keys = AVATAR_COLOR_KEYS.filter((k) => k !== excludeKey);
  return keys.slice(0, DEBUG_GO_PIN_COUNT).map((k) => colorGroups[k]);
}

/**
 * Local pin + optional __DEV__ debug pins, all centered on GO with a fan offset.
 */
export function buildGoPins(opts: {
  goTile: TileLayout;
  pinRadius: number;
  localAccent: string;
  localAccentKey: AvatarColorKey;
  includeDebug: boolean;
}): BoardPinModel[] {
  const { goTile, pinRadius, localAccent, localAccentKey, includeDebug } = opts;
  const cx = goTile.x + goTile.width / 2;
  const cy = goTile.y + goTile.height / 2;
  const debugAccents = includeDebug ? debugPinAccents(localAccentKey) : [];
  const total = 1 + debugAccents.length;
  const spacing = Math.max(pinRadius * 1.15, Math.min(goTile.width, goTile.height) * 0.14);
  const offsets = pinFanOffsets(total, spacing);

  const pins: BoardPinModel[] = [
    {
      id: 'local',
      x: cx + (offsets[0]?.x ?? 0),
      y: cy + (offsets[0]?.y ?? 0),
      radius: pinRadius,
      accent: localAccent,
      isLocal: true,
    },
  ];

  debugAccents.forEach((accent, i) => {
    const off = offsets[i + 1] ?? { x: 0, y: 0 };
    pins.push({
      id: `debug-${i}`,
      x: cx + off.x,
      y: cy + off.y,
      radius: pinRadius,
      accent,
    });
  });

  return pins;
}
