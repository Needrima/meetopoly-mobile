import {
  Easing,
  makeMutable,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { PresencePose } from '@/lib/presencePose';

/** Match ~10 Hz presence send (Phase 7.2 / 23.1). */
const INTERP_MS = 100;

type PeerSlot = {
  poseX: SharedValue<number>;
  poseY: SharedValue<number>;
  surfaceW: number;
  surfaceH: number;
  lastXNorm: number;
  lastYNorm: number;
};

export type RemotePoseRegistry = {
  applyPose: (pose: PresencePose) => boolean;
  setNormPose: (userId: string, xNorm: number, yNorm: number) => void;
  setSurface: (userId: string, boardW: number, boardH: number) => void;
  ensurePeer: (userId: string) => PeerSlot;
  removePeer: (userId: string) => void;
  clearAll: () => void;
  hasPeer: (userId: string) => boolean;
  getPeerIds: () => string[];
};

export function createRemotePoseRegistry(): RemotePoseRegistry {
  const slots = new Map<string, PeerSlot>();

  const ensurePeer = (userId: string): PeerSlot => {
    let slot = slots.get(userId);
    if (!slot) {
      slot = {
        poseX: makeMutable(0),
        poseY: makeMutable(0),
        surfaceW: 0,
        surfaceH: 0,
        lastXNorm: Number.NaN,
        lastYNorm: Number.NaN,
      };
      slots.set(userId, slot);
    }
    return slot;
  };

  const animateToNorm = (slot: PeerSlot, xNorm: number, yNorm: number) => {
    const x = clamp01(xNorm);
    const y = clamp01(yNorm);
    if (
      slot.lastXNorm === x &&
      slot.lastYNorm === y &&
      slot.surfaceW > 0 &&
      slot.surfaceH > 0
    ) {
      return;
    }
    slot.lastXNorm = x;
    slot.lastYNorm = y;
    const w = Math.max(0, slot.surfaceW);
    const h = Math.max(0, slot.surfaceH);
    const tx = x * w;
    const ty = y * h;
    slot.poseX.value = withTiming(tx, {
      duration: INTERP_MS,
      easing: Easing.linear,
    });
    slot.poseY.value = withTiming(ty, {
      duration: INTERP_MS,
      easing: Easing.linear,
    });
  };

  return {
    ensurePeer,

    applyPose(pose: PresencePose): boolean {
      const isNew = !slots.has(pose.userId);
      const slot = ensurePeer(pose.userId);
      animateToNorm(slot, pose.x, pose.y);
      return isNew;
    },

    setNormPose(userId: string, xNorm: number, yNorm: number) {
      const slot = ensurePeer(userId);
      animateToNorm(slot, xNorm, yNorm);
    },

    setSurface(userId: string, boardW: number, boardH: number) {
      const slot = slots.get(userId);
      if (!slot) {
        return;
      }
      const w = Math.max(0, boardW);
      const h = Math.max(0, boardH);
      if (slot.surfaceW === w && slot.surfaceH === h) {
        return;
      }
      slot.surfaceW = w;
      slot.surfaceH = h;
      if (Number.isFinite(slot.lastXNorm) && Number.isFinite(slot.lastYNorm)) {
        slot.poseX.value = slot.lastXNorm * w;
        slot.poseY.value = slot.lastYNorm * h;
      }
    },

    removePeer(userId: string) {
      slots.delete(userId);
    },

    clearAll() {
      slots.clear();
    },

    hasPeer(userId: string) {
      return slots.has(userId);
    },

    getPeerIds() {
      return [...slots.keys()].sort();
    },
  };
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
