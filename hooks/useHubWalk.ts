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
  /** Walk surface width in px. 0 = not ready. */
  width: number;
  /** Walk surface height in px. 0 = not ready. */
  height: number;
  username?: string | null;
  enabled?: boolean;
};

/**
 * Hub-local walk on the full center rail (rect) so avatars can cross the heading.
 */
export function useHubWalk({
  width,
  height,
  username,
  enabled = true,
}: UseHubWalkOpts): HubWalkState {
  const initials = useMemo(() => usernameInitials(username), [username]);
  const accentRef = useRef(pickRandomAvatarColor());
  const stickRef = useRef<StickInput>({ x: 0, y: 0 });
  const poseRef = useRef<Vec2>({ x: 0, y: 0 });
  const poseX = useSharedValue(0);
  const poseY = useSharedValue(0);
  const spawnedKey = useRef('');

  const minSide = Math.min(width, height);
  const avatarRadius =
    minSide > 0
      ? Math.max(10, Math.round(minSide * BOARD_WALK.avatarRadiusFrac * 1.35))
      : 12;

  const applyPose = (next: Vec2) => {
    poseRef.current = next;
    poseX.value = next.x;
    poseY.value = next.y;
  };

  const clampPose = (
    p: Vec2,
    w: number,
    h: number,
    radius: number,
  ): Vec2 => {
    const loX = radius;
    const hiX = Math.max(loX, w - radius);
    const loY = radius;
    const hiY = Math.max(loY, h - radius);
    return {
      x: Math.min(hiX, Math.max(loX, p.x)),
      y: Math.min(hiY, Math.max(loY, p.y)),
    };
  };

  useEffect(() => {
    if (!enabled || width <= 0 || height <= 0) {
      return;
    }
    const key = `${width}x${height}`;
    if (spawnedKey.current === key) {
      return;
    }
    applyPose(
      clampPose({ x: width / 2, y: height / 2 }, width, height, avatarRadius),
    );
    spawnedKey.current = key;
  }, [width, height, enabled, avatarRadius, poseX, poseY]);

  useEffect(() => {
    if (!enabled || width <= 0 || height <= 0) {
      return;
    }

    let raf = 0;
    let last = performance.now();
    const speed = minSide * BOARD_WALK.speedFrac;

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
          width,
          height,
          avatarRadius,
        );
        applyPose(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [width, height, minSide, enabled, avatarRadius, poseX, poseY]);

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
