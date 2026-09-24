/**
 * Locked board-presence pose shape (Phase 7.1).
 * Coordinates are board-normalized 0..1 (same as BoardSession poseNorm).
 * Server stamps userId/username; clients should still send them for debugging only.
 */

export const PRESENCE_POSE_TYPE = 'pose' as const;

export type PresencePose = {
  type: typeof PRESENCE_POSE_TYPE;
  userId: string;
  username: string;
  x: number;
  y: number;
  /** Optional facing angle in radians. */
  rot?: number;
  /** Optional client send time (unix ms) for Phase 7.2 interpolation. */
  t?: number;
};

export type PresencePoseInput = {
  x: number;
  y: number;
  rot?: number;
  t?: number;
};

export function encodePresencePose(
  identity: { userId: string; username: string },
  pose: PresencePoseInput,
): string {
  const msg: PresencePose = {
    type: PRESENCE_POSE_TYPE,
    userId: identity.userId,
    username: identity.username,
    x: pose.x,
    y: pose.y,
  };
  if (pose.rot != null && Number.isFinite(pose.rot)) {
    msg.rot = pose.rot;
  }
  if (pose.t != null && Number.isFinite(pose.t)) {
    msg.t = pose.t;
  }
  return JSON.stringify(msg);
}

export function parsePresencePose(raw: string): PresencePose | null {
  try {
    const msg = JSON.parse(raw) as Partial<PresencePose>;
    if (msg.type != null && msg.type !== PRESENCE_POSE_TYPE) {
      return null;
    }
    if (typeof msg.userId !== 'string' || msg.userId.length === 0) {
      return null;
    }
    if (typeof msg.x !== 'number' || typeof msg.y !== 'number') {
      return null;
    }
    if (!Number.isFinite(msg.x) || !Number.isFinite(msg.y)) {
      return null;
    }
    const out: PresencePose = {
      type: PRESENCE_POSE_TYPE,
      userId: msg.userId,
      username: typeof msg.username === 'string' ? msg.username : 'Player',
      x: msg.x,
      y: msg.y,
    };
    if (typeof msg.rot === 'number' && Number.isFinite(msg.rot)) {
      out.rot = msg.rot;
    }
    if (typeof msg.t === 'number' && Number.isFinite(msg.t)) {
      out.t = msg.t;
    }
    return out;
  } catch {
    return null;
  }
}
