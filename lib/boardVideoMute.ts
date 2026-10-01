/**
 * Phase 16 — DataChannel signal for board camera off.
 * Sender `track.enabled=false` does not surface to remotes; they keep the last
 * frame unless we announce mute state (AvatarPod same as local).
 */

export const VIDEO_MUTED_MSG_TYPE = 'videoMuted' as const;

export type VideoMutedMessage = {
  type: typeof VIDEO_MUTED_MSG_TYPE;
  userId: string;
  muted: boolean;
};

export function encodeVideoMuted(userId: string, muted: boolean): string {
  const msg: VideoMutedMessage = {
    type: VIDEO_MUTED_MSG_TYPE,
    userId,
    muted,
  };
  return JSON.stringify(msg);
}

export function parseVideoMuted(raw: string): VideoMutedMessage | null {
  try {
    const msg = JSON.parse(raw) as Partial<VideoMutedMessage>;
    if (
      msg?.type !== VIDEO_MUTED_MSG_TYPE ||
      typeof msg.userId !== 'string' ||
      !msg.userId.trim() ||
      typeof msg.muted !== 'boolean'
    ) {
      return null;
    }
    return {
      type: VIDEO_MUTED_MSG_TYPE,
      userId: msg.userId.trim(),
      muted: msg.muted,
    };
  } catch {
    return null;
  }
}
