import { useEffect, useMemo, useRef, useState } from 'react';

import type { BoardLayout, TileLayout } from '@/components/board/boardLayout';
import {
  randomCenterSpawn,
  resolveWalkCollisions,
  type Vec2,
} from '@/components/board/boardCollision';
import { colorGroups } from '@/theme/colors';

/** Eight classic Monopoly track colors (no violet). */
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

export type StickInput = { x: number; y: number };

export type BoardWalkState = {
  pose: Vec2;
  pin: Vec2;
  accent: string;
  accentKey: AvatarColorKey;
  initials: string;
  avatarRadius: number;
  pinRadius: number;
  setStick: (stick: StickInput) => void;
};

const SPEED_FRAC = 0.42;

export function usernameInitials(username: string | null | undefined): string {
  const raw = (username ?? '').trim();
  if (raw.length >= 2) {
    return raw.slice(0, 2).toUpperCase();
  }
  if (raw.length === 1) {
    return (raw + raw).toUpperCase();
  }
  return '??';
}

export function pickRandomAvatarColor(): { key: AvatarColorKey; hex: string } {
  const key = AVATAR_COLOR_KEYS[Math.floor(Math.random() * AVATAR_COLOR_KEYS.length)]!;
  return { key, hex: colorGroups[key] };
}

function goTileFromLayout(layout: BoardLayout): TileLayout | undefined {
  return layout.tiles.find((t) => t.boardIndex === 0) ?? layout.tiles.find((t) => t.isCorner);
}

type UseBoardWalkOpts = {
  layout: BoardLayout | null;
  username?: string | null;
  enabled?: boolean;
};

/**
 * Local board walk: spawn in green center, stick-driven move, hard edge+decks, soft pin.
 */
export function useBoardWalk({
  layout,
  username,
  enabled = true,
}: UseBoardWalkOpts): BoardWalkState {
  const initials = useMemo(() => usernameInitials(username), [username]);
  const accentRef = useRef(pickRandomAvatarColor());
  const stickRef = useRef<StickInput>({ x: 0, y: 0 });
  const poseRef = useRef<Vec2>({ x: 0, y: 0 });
  const [pose, setPose] = useState<Vec2>({ x: 0, y: 0 });
  const spawnedForSize = useRef<number | null>(null);

  const avatarRadius = layout ? Math.max(10, Math.round(layout.size * 0.022)) : 12;
  const pinRadius = layout ? Math.max(7, Math.round(layout.size * 0.016)) : 8;

  const pin = useMemo(() => {
    if (!layout) {
      return { x: 0, y: 0 };
    }
    const go = goTileFromLayout(layout);
    if (!go) {
      return { x: layout.size - layout.trackDepth / 2, y: layout.size - layout.trackDepth / 2 };
    }
    return { x: go.x + go.width / 2, y: go.y + go.height / 2 };
  }, [layout]);

  useEffect(() => {
    if (!layout || !enabled) {
      return;
    }
    if (spawnedForSize.current === layout.size) {
      return;
    }
    const spawn = randomCenterSpawn(layout.center, layout.decks, avatarRadius);
    poseRef.current = spawn;
    setPose(spawn);
    spawnedForSize.current = layout.size;
  }, [layout, enabled, avatarRadius]);

  useEffect(() => {
    if (!layout || !enabled) {
      return;
    }

    let raf = 0;
    let last = performance.now();
    const speed = layout.size * SPEED_FRAC;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const stick = stickRef.current;
      const mag = Math.hypot(stick.x, stick.y);
      if (mag > 0.04) {
        const nx = stick.x / Math.max(mag, 1);
        const ny = stick.y / Math.max(mag, 1);
        const scale = Math.min(1, mag);
        const proposed = {
          x: poseRef.current.x + nx * speed * scale * dt,
          y: poseRef.current.y + ny * speed * scale * dt,
        };
        const next = resolveWalkCollisions(
          proposed,
          avatarRadius,
          layout.size,
          layout.decks,
          [{ x: pin.x, y: pin.y, radius: pinRadius, soft: true }],
        );
        poseRef.current = next;
        setPose(next);
      } else {
        // Still soft-resolve if overlapping pin while idle
        const next = resolveWalkCollisions(
          poseRef.current,
          avatarRadius,
          layout.size,
          layout.decks,
          [{ x: pin.x, y: pin.y, radius: pinRadius, soft: true }],
        );
        if (next.x !== poseRef.current.x || next.y !== poseRef.current.y) {
          poseRef.current = next;
          setPose(next);
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [layout, enabled, avatarRadius, pin.x, pin.y, pinRadius]);

  const setStick = (stick: StickInput) => {
    const mag = Math.hypot(stick.x, stick.y);
    if (mag > 1) {
      stickRef.current = { x: stick.x / mag, y: stick.y / mag };
    } else {
      stickRef.current = stick;
    }
  };

  return {
    pose,
    pin,
    accent: accentRef.current.hex,
    accentKey: accentRef.current.key,
    initials,
    avatarRadius,
    pinRadius,
    setStick,
  };
}
