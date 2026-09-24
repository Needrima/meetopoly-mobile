import { useEffect } from 'react';
import {
  Easing,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/** Match ~10 Hz presence send so motion eases between samples. */
const INTERP_MS = 100;

/**
 * Phase 7.2 — board-pixel SharedValues that ease toward each new norm pose.
 */
export function useInterpolatedBoardPose(
  xNorm: number,
  yNorm: number,
  boardSize: number,
): { poseX: SharedValue<number>; poseY: SharedValue<number> } {
  const x = clamp01(xNorm) * Math.max(0, boardSize);
  const y = clamp01(yNorm) * Math.max(0, boardSize);
  const poseX = useSharedValue(x);
  const poseY = useSharedValue(y);

  useEffect(() => {
    const tx = clamp01(xNorm) * Math.max(0, boardSize);
    const ty = clamp01(yNorm) * Math.max(0, boardSize);
    poseX.value = withTiming(tx, {
      duration: INTERP_MS,
      easing: Easing.linear,
    });
    poseY.value = withTiming(ty, {
      duration: INTERP_MS,
      easing: Easing.linear,
    });
  }, [xNorm, yNorm, boardSize, poseX, poseY]);

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
