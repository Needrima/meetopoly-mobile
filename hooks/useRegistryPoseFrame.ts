import { useFrameCallback } from 'react-native-reanimated';

import type { RegistryPeerSlot } from '@/lib/remotePoseRegistry';

/** Hold at target after segment ends; brief gap before next packet (Phase 23.3). */
const MAX_EXTRAP_MS = 150;

/**
 * UI-thread linear segment + capped hold for registry avatar display values.
 */
export function useRegistryPoseFrame(slot: RegistryPeerSlot): void {
  useFrameCallback((frame) => {
    'worklet';
    if (slot.segPending.value) {
      const w = slot.surfaceW.value;
      const h = slot.surfaceH.value;
      const toX = slot.pendingXNorm.value * w;
      const toY = slot.pendingYNorm.value * h;
      slot.segFromX.value = slot.poseX.value;
      slot.segFromY.value = slot.poseY.value;
      slot.segToX.value = toX;
      slot.segToY.value = toY;
      slot.segStartMs.value = frame.timestamp;
      slot.segPending.value = 0;
      if (w <= 0 || h <= 0) {
        slot.segDurationMs.value = 0;
        return;
      }
    }
    const dur = slot.segDurationMs.value;
    if (dur <= 0) {
      return;
    }
    const elapsed = frame.timestamp - slot.segStartMs.value;
    if (elapsed <= dur) {
      const alpha = elapsed / dur;
      slot.poseX.value =
        slot.segFromX.value +
        (slot.segToX.value - slot.segFromX.value) * alpha;
      slot.poseY.value =
        slot.segFromY.value +
        (slot.segToY.value - slot.segFromY.value) * alpha;
      return;
    }
    slot.poseX.value = slot.segToX.value;
    slot.poseY.value = slot.segToY.value;
    if (elapsed - dur > MAX_EXTRAP_MS) {
      slot.segDurationMs.value = 0;
    }
  });
}
