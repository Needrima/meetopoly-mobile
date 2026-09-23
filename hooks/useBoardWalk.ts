import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import type { Location } from '@/api/types';
import {
  BOARD_WALK,
  AVATAR_COLOR_KEYS,
  type AvatarColorKey,
} from '@/components/board/boardConstants';
import {
  randomCenterSpawn,
  resolveWalkCollisions,
  type CircleObstacle,
  type Vec2,
} from '@/components/board/boardCollision';
import type { BoardLayout, TileLayout } from '@/components/board/boardLayout';
import { findNearestEnterable } from '@/components/board/boardNearby';
import {
  buildGoPins,
  type BoardPinModel,
} from '@/components/board/boardPins';
import type { NormPose } from '@/hooks/useBoardSession';
import { colorGroups } from '@/theme/colors';

export type { NormPose } from '@/hooks/useBoardSession';
export type { AvatarColorKey } from '@/components/board/boardConstants';
export { AVATAR_COLOR_KEYS } from '@/components/board/boardConstants';

export type StickInput = { x: number; y: number };

export type BoardWalkState = {
  /** Avatar center — driven on UI thread; do not use for React layout each frame. */
  poseX: SharedValue<number>;
  poseY: SharedValue<number>;
  /** Snapshot pose for Enter / persist (reads JS ref, not React state). */
  getPose: () => Vec2;
  pins: BoardPinModel[];
  accent: string;
  accentKey: AvatarColorKey;
  initials: string;
  avatarRadius: number;
  pinRadius: number;
  nearby: Location | null;
  setStick: (stick: StickInput) => void;
};

export function usernameInitials(username: string | null | undefined): string {
  const raw = (username ?? '').trim();
  if (raw.length >= 1) {
    return raw.slice(0, 1).toUpperCase();
  }
  return '?';
}

export function pickRandomAvatarColor(): { key: AvatarColorKey; hex: string } {
  const key =
    AVATAR_COLOR_KEYS[Math.floor(Math.random() * AVATAR_COLOR_KEYS.length)]!;
  return { key, hex: colorGroups[key] };
}

function goTileFromLayout(layout: BoardLayout): TileLayout | undefined {
  return (
    layout.tiles.find((t) => t.boardIndex === 0) ??
    layout.tiles.find((t) => t.isCorner)
  );
}

function softObstaclesFromPins(pins: BoardPinModel[]): CircleObstacle[] {
  return pins.map((p) => ({
    x: p.x,
    y: p.y,
    radius: p.radius,
    soft: true,
  }));
}

type UseBoardWalkOpts = {
  layout: BoardLayout | null;
  locations: Location[];
  username?: string | null;
  enabled?: boolean;
  restorePoseNorm?: NormPose | null;
  restoreAccent?: { key: AvatarColorKey; hex: string } | null;
  onAccentReady?: (accent: { key: AvatarColorKey; hex: string }) => void;
};

/**
 * Local board walk: Reanimated pose SV + JS collision; nearby only on slug change.
 */
export function useBoardWalk({
  layout,
  locations,
  username,
  enabled = true,
  restorePoseNorm = null,
  restoreAccent = null,
  onAccentReady,
}: UseBoardWalkOpts): BoardWalkState {
  const initials = useMemo(() => usernameInitials(username), [username]);
  const accentRef = useRef(restoreAccent ?? pickRandomAvatarColor());
  const accentAnnounced = useRef(false);
  const stickRef = useRef<StickInput>({ x: 0, y: 0 });
  const poseRef = useRef<Vec2>({ x: 0, y: 0 });
  const nearbyRef = useRef<Location | null>(null);
  const poseX = useSharedValue(0);
  const poseY = useSharedValue(0);
  const [nearby, setNearby] = useState<Location | null>(null);
  const [accentTick, setAccentTick] = useState(0);
  const spawnedForSize = useRef<number | null>(null);
  const idleFrames = useRef(0);

  const byIndex = useMemo(() => {
    const map = new Map<number, Location>();
    for (const loc of locations) {
      map.set(loc.boardIndex, loc);
    }
    return map;
  }, [locations]);

  const avatarRadius = layout
    ? Math.max(8, Math.round(layout.size * BOARD_WALK.avatarRadiusFrac))
    : 10;
  const pinRadius = layout
    ? Math.max(6, Math.round(layout.size * BOARD_WALK.pinRadiusFrac))
    : 7;

  const pins = useMemo(() => {
    if (!layout) {
      return [] as BoardPinModel[];
    }
    const go = goTileFromLayout(layout);
    if (!go) {
      return [
        {
          id: 'local',
          x: layout.size - layout.trackDepth / 2,
          y: layout.size - layout.trackDepth / 2,
          radius: pinRadius,
          accent: accentRef.current.hex,
          isLocal: true,
        },
      ];
    }
    return buildGoPins({
      goTile: go,
      pinRadius,
      localAccent: accentRef.current.hex,
      localAccentKey: accentRef.current.key,
      includeDebug: __DEV__,
    });
  }, [layout, pinRadius, accentTick]);

  const softPins = useMemo(() => softObstaclesFromPins(pins), [pins]);
  const softPinsRef = useRef(softPins);
  softPinsRef.current = softPins;
  const byIndexRef = useRef(byIndex);
  byIndexRef.current = byIndex;

  const applyPose = (next: Vec2) => {
    poseRef.current = next;
    poseX.value = next.x;
    poseY.value = next.y;
  };

  useEffect(() => {
    if (restoreAccent) {
      accentRef.current = restoreAccent;
      setAccentTick((t) => t + 1);
    }
  }, [restoreAccent?.hex, restoreAccent?.key]);

  useEffect(() => {
    if (!accentAnnounced.current && onAccentReady) {
      accentAnnounced.current = true;
      onAccentReady(accentRef.current);
    }
  }, [onAccentReady, accentTick]);

  useEffect(() => {
    if (!layout || !enabled) {
      return;
    }
    if (spawnedForSize.current === layout.size) {
      return;
    }
    let spawn: Vec2;
    if (
      restorePoseNorm &&
      Number.isFinite(restorePoseNorm.x) &&
      Number.isFinite(restorePoseNorm.y)
    ) {
      spawn = {
        x: restorePoseNorm.x * layout.size,
        y: restorePoseNorm.y * layout.size,
      };
      spawn = resolveWalkCollisions(
        spawn,
        avatarRadius,
        layout.size,
        layout.decks,
        softPinsRef.current,
      );
    } else {
      spawn = randomCenterSpawn(layout.center, layout.decks, avatarRadius);
    }
    applyPose(spawn);
    spawnedForSize.current = layout.size;
  }, [
    layout,
    enabled,
    avatarRadius,
    restorePoseNorm?.x,
    restorePoseNorm?.y,
    poseX,
    poseY,
  ]);

  useEffect(() => {
    if (!layout || !enabled) {
      return;
    }

    let raf = 0;
    let last = performance.now();
    const speed = layout.size * BOARD_WALK.speedFrac;

    const publishNearby = (p: Vec2) => {
      const next = findNearestEnterable(p, layout, byIndexRef.current);
      const prevSlug = nearbyRef.current?.slug ?? null;
      const nextSlug = next?.slug ?? null;
      if (prevSlug !== nextSlug) {
        nearbyRef.current = next;
        setNearby(next);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const stick = stickRef.current;
      const mag = Math.hypot(stick.x, stick.y);
      if (mag > 0.04) {
        idleFrames.current = 0;
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
          softPinsRef.current,
        );
        applyPose(next);
        publishNearby(next);
      } else {
        idleFrames.current += 1;
        // Soft-pin settle occasionally while idle; skip most frames.
        if (idleFrames.current % 8 === 0) {
          const next = resolveWalkCollisions(
            poseRef.current,
            avatarRadius,
            layout.size,
            layout.decks,
            softPinsRef.current,
          );
          if (
            next.x !== poseRef.current.x ||
            next.y !== poseRef.current.y
          ) {
            applyPose(next);
          }
        }
        publishNearby(poseRef.current);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [layout, enabled, avatarRadius, poseX, poseY]);

  const setStick = (stick: StickInput) => {
    const mag = Math.hypot(stick.x, stick.y);
    if (mag > 1) {
      stickRef.current = { x: stick.x / mag, y: stick.y / mag };
    } else {
      stickRef.current = stick;
    }
  };

  const getPose = () => ({ ...poseRef.current });

  return {
    poseX,
    poseY,
    getPose,
    pins,
    accent: accentRef.current.hex,
    accentKey: accentRef.current.key,
    initials,
    avatarRadius,
    pinRadius,
    nearby,
    setStick,
  };
}
