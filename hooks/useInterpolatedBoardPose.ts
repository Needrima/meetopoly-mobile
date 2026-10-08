import { useEffect } from 'react';
import {
  Easing,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { REGISTRY_INTERP_DEFAULT_MS } from '@/lib/remotePoseRegistry';

/** Match ~10 Hz presence send so motion eases between samples. */
const INTERP_MS = REGISTRY_INTERP_DEFAULT_MS;

/**
 * Phase 7.2 — legacy pose-prop remotes (HubScene fallback only).
 * Board/hub registry avatars use `useRegistryPoseFrame` (Phase 23.3).
 * `boardHeight` defaults to `boardWidth` for square surfaces (board); hub passes both.
 */
export function useInterpolatedBoardPose(
  xNorm: number,
  yNorm: number,
  boardWidth: number,
  boardHeight = boardWidth,
): { poseX: SharedValue<number>; poseY: SharedValue<number> } {
  const x = clamp01(xNorm) * Math.max(0, boardWidth);
  const y = clamp01(yNorm) * Math.max(0, boardHeight);
  const poseX = useSharedValue(x);
  const poseY = useSharedValue(y);

  useEffect(() => {
    const tx = clamp01(xNorm) * Math.max(0, boardWidth);
    const ty = clamp01(yNorm) * Math.max(0, boardHeight);
    poseX.value = withTiming(tx, {
      duration: INTERP_MS,
      easing: Easing.linear,
    });
    poseY.value = withTiming(ty, {
      duration: INTERP_MS,
      easing: Easing.linear,
    });
  }, [xNorm, yNorm, boardWidth, boardHeight, poseX, poseY]);

  return { poseX, poseY };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) {
    return 0.5;
  }
  if (n < 0) {
    return 0;
  }
  if (n > 1) {
    return 1;
  }
  return n;
}
