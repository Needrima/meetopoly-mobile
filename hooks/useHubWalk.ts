import { useEffect, useMemo, useRef } from 'react';
import {
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { BOARD_WALK } from '@/components/board/boardConstants';
import {
  pickRandomAvatarColor,
  usernameInitials,
  type StickInput,
} from '@/hooks/useBoardWalk';

type Vec2 = { x: number; y: number };

export type HubWalkState = {
  poseX: SharedValue<number>;
  poseY: SharedValue<number>;
  getPose: () => Vec2;
  setStick: (stick: StickInput) => void;
  accent: string;
  initials: string;
  avatarRadius: number;
};

type UseHubWalkOpts = {
  /** Walk surface side in px (square). 0 = not ready. */
  size: number;
  username?: string | null;
  enabled?: boolean;
};

/**
 * Phase 8.1 — hub-local walk: stick → clamped pose on a square surface (no board collisions).
 */
export function useHubWalk({
  size,
  username,
  enabled = true,
}: UseHubWalkOpts): HubWalkState {
  const initials = useMemo(() => usernameInitials(username), [username]);
  const accentRef = useRef(pickRandomAvatarColor());
  const stickRef = useRef<StickInput>({ x: 0, y: 0 });
  const poseRef = useRef<Vec2>({ x: 0, y: 0 });
  const poseX = useSharedValue(0);
  const poseY = useSharedValue(0);
  const spawnedForSize = useRef(0);

  const avatarRadius =
    size > 0 ? Math.max(10, Math.round(size * BOARD_WALK.avatarRadiusFrac * 1.35)) : 12;

  const applyPose = (next: Vec2) => {
    poseRef.current = next;
    poseX.value = next.x;
    poseY.value = next.y;
  };

  const clampPose = (p: Vec2, side: number, radius: number): Vec2 => {
    const lo = radius;
    const hi = Math.max(lo, side - radius);
    return {
      x: Math.min(hi, Math.max(lo, p.x)),
      y: Math.min(hi, Math.max(lo, p.y)),
    };
  };

  useEffect(() => {
    if (!enabled || size <= 0) {
      return;
    }
    if (spawnedForSize.current === size) {
      return;
    }
    applyPose(clampPose({ x: size / 2, y: size / 2 }, size, avatarRadius));
    spawnedForSize.current = size;
  }, [size, enabled, avatarRadius, poseX, poseY]);

  useEffect(() => {
    if (!enabled || size <= 0) {
      return;
    }

    let raf = 0;
    let last = performance.now();
    const speed = size * BOARD_WALK.speedFrac;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const stick = stickRef.current;
      const mag = Math.hypot(stick.x, stick.y);
      if (mag > 0.02) {
        const nx = stick.x / mag;
        const ny = stick.y / mag;
        const next = clampPose(
          {
            x: poseRef.current.x + nx * speed * dt,
            y: poseRef.current.y + ny * speed * dt,
          },
          size,
          avatarRadius,
        );
        applyPose(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [size, enabled, avatarRadius, poseX, poseY]);

  const setStick = (stick: StickInput) => {
    stickRef.current = stick;
  };

  const getPose = () => ({ ...poseRef.current });

  return {
    poseX,
    poseY,
    getPose,
    setStick,
    accent: accentRef.current.hex,
    initials,
    avatarRadius,
  };
}
