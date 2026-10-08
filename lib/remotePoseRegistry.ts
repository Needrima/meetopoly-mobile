import { makeMutable, runOnUI, type SharedValue } from 'react-native-reanimated';

import type { PresencePose } from '@/lib/presencePose';

/** Default segment when `pose.t` is missing (Phase 7.2 ~10 Hz). */
export const REGISTRY_INTERP_DEFAULT_MS = 100;
const INTERP_MIN_MS = 50;
const INTERP_MAX_MS = 200;

/**
 * UI-thread only — never attach plain JS fields (Phase 23.3.1).
 * Passed to `runOnUI` / `useRegistryPoseFrame` only.
 */
export type RegistryPeerSlot = {
  poseX: SharedValue<number>;
  poseY: SharedValue<number>;
  surfaceW: SharedValue<number>;
  surfaceH: SharedValue<number>;
  segFromX: SharedValue<number>;
  segFromY: SharedValue<number>;
  segToX: SharedValue<number>;
  segToY: SharedValue<number>;
  segStartMs: SharedValue<number>;
  segDurationMs: SharedValue<number>;
  segPending: SharedValue<number>;
  pendingXNorm: SharedValue<number>;
  pendingYNorm: SharedValue<number>;
};

type PeerJsState = {
  lastXNorm: number;
  lastYNorm: number;
  lastPacketMs: number;
};

export type RemotePoseRegistry = {
  applyPose: (pose: PresencePose) => boolean;
  setNormPose: (userId: string, xNorm: number, yNorm: number) => void;
  setSurface: (userId: string, boardW: number, boardH: number) => void;
  ensurePeer: (userId: string) => RegistryPeerSlot;
  removePeer: (userId: string) => void;
  clearAll: () => void;
  hasPeer: (userId: string) => boolean;
  getPeerIds: () => string[];
};

export function createRemotePoseRegistry(): RemotePoseRegistry {
  const worklets = new Map<string, RegistryPeerSlot>();
  const jsByUser = new Map<string, PeerJsState>();

  const createWorkletSlot = (): RegistryPeerSlot => ({
    poseX: makeMutable(0),
    poseY: makeMutable(0),
    surfaceW: makeMutable(0),
    surfaceH: makeMutable(0),
    segFromX: makeMutable(0),
    segFromY: makeMutable(0),
    segToX: makeMutable(0),
    segToY: makeMutable(0),
    segStartMs: makeMutable(0),
    segDurationMs: makeMutable(0),
    segPending: makeMutable(0),
    pendingXNorm: makeMutable(0.5),
    pendingYNorm: makeMutable(0.5),
  });

  const ensureJs = (userId: string): PeerJsState => {
    let js = jsByUser.get(userId);
    if (!js) {
      js = {
        lastXNorm: Number.NaN,
        lastYNorm: Number.NaN,
        lastPacketMs: 0,
      };
      jsByUser.set(userId, js);
    }
    return js;
  };

  const ensurePeer = (userId: string): RegistryPeerSlot => {
    let wl = worklets.get(userId);
    if (!wl) {
      wl = createWorkletSlot();
      worklets.set(userId, wl);
      ensureJs(userId);
    }
    return wl;
  };

  const beginSegment = (
    userId: string,
    xNorm: number,
    yNorm: number,
    durationMs: number,
  ) => {
    const wl = ensurePeer(userId);
    const js = ensureJs(userId);
    const x = clamp01(xNorm);
    const y = clamp01(yNorm);
    if (js.lastXNorm === x && js.lastYNorm === y) {
      return;
    }
    js.lastXNorm = x;
    js.lastYNorm = y;
    const dur = clampDuration(durationMs);
    runOnUI(beginSegmentWorklet)(wl, x, y, dur);
  };

  return {
    ensurePeer,

    applyPose(pose: PresencePose): boolean {
      const isNew = !worklets.has(pose.userId);
      const js = ensureJs(pose.userId);
      ensurePeer(pose.userId);
      const nowMs = Date.now();
      let duration = REGISTRY_INTERP_DEFAULT_MS;
      if (js.lastPacketMs > 0) {
        duration = clampDuration(nowMs - js.lastPacketMs);
      }
      js.lastPacketMs = nowMs;
      beginSegment(pose.userId, pose.x, pose.y, duration);
      return isNew;
    },

    setNormPose(userId: string, xNorm: number, yNorm: number) {
      ensurePeer(userId);
      beginSegment(userId, xNorm, yNorm, REGISTRY_INTERP_DEFAULT_MS);
    },

    setSurface(userId: string, boardW: number, boardH: number) {
      const wl = worklets.get(userId);
      const js = jsByUser.get(userId);
      if (!wl || !js) {
        return;
      }
      const w = Math.max(0, boardW);
      const h = Math.max(0, boardH);
      const xNorm = Number.isFinite(js.lastXNorm)
        ? clamp01(js.lastXNorm)
        : Number.NaN;
      const yNorm = Number.isFinite(js.lastYNorm)
        ? clamp01(js.lastYNorm)
        : Number.NaN;
      runOnUI(resizeSurfaceWorklet)(wl, w, h, xNorm, yNorm);
    },

    removePeer(userId: string) {
      worklets.delete(userId);
      jsByUser.delete(userId);
    },

    clearAll() {
      worklets.clear();
      jsByUser.clear();
    },

    hasPeer(userId: string) {
      return worklets.has(userId);
    },

    getPeerIds() {
      return [...worklets.keys()].sort();
    },
  };
}

function beginSegmentWorklet(
  slot: RegistryPeerSlot,
  xNorm: number,
  yNorm: number,
  durationMs: number,
) {
  'worklet';
  slot.pendingXNorm.value = xNorm;
  slot.pendingYNorm.value = yNorm;
  slot.segDurationMs.value = durationMs;
  slot.segPending.value = 1;
}

function resizeSurfaceWorklet(
  slot: RegistryPeerSlot,
  w: number,
  h: number,
  xNorm: number,
  yNorm: number,
) {
  'worklet';
  if (slot.surfaceW.value === w && slot.surfaceH.value === h) {
    return;
  }
  slot.surfaceW.value = w;
  slot.surfaceH.value = h;
  slot.segPending.value = 0;
  if (!Number.isFinite(xNorm) || !Number.isFinite(yNorm) || w <= 0 || h <= 0) {
    return;
  }
  const tx = xNorm * w;
  const ty = yNorm * h;
  slot.poseX.value = tx;
  slot.poseY.value = ty;
  slot.segFromX.value = tx;
  slot.segFromY.value = ty;
  slot.segToX.value = tx;
  slot.segToY.value = ty;
  slot.segDurationMs.value = 0;
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

function clampDuration(ms: number): number {
  if (!Number.isFinite(ms)) {
    return REGISTRY_INTERP_DEFAULT_MS;
  }
  if (ms < INTERP_MIN_MS) {
    return INTERP_MIN_MS;
  }
  if (ms > INTERP_MAX_MS) {
    return INTERP_MAX_MS;
  }
  return ms;
}
