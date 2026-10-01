import { Platform } from 'react-native';

/**
 * Landscape-locked Meetopoly: iOS camera frames often need a display correction
 * so local + remotes see the publisher upright. Applied only to iOS-sourced video
 * (never to Android publishers).
 *
 * If upright is wrong the other way, flip the sign to 90.
 */
export const IOS_BOARD_VIDEO_ROTATION_DEG = 90;

export const VIDEO_ORIENTATION_MSG_TYPE = 'videoOrientation' as const;

export type VideoOrientationMessage = {
  type: typeof VIDEO_ORIENTATION_MSG_TYPE;
  userId: string;
  /** Degrees CW to rotate the RTCView for upright display. */
  rotationDeg: number;
};

/** Local board tile rotation for this device's published camera. */
export function localBoardVideoRotationDeg(): number {
  return Platform.OS === 'ios' ? IOS_BOARD_VIDEO_ROTATION_DEG : 0;
}

export function encodeVideoOrientation(
  userId: string,
  rotationDeg: number,
): string {
  const msg: VideoOrientationMessage = {
    type: VIDEO_ORIENTATION_MSG_TYPE,
    userId,
    rotationDeg,
  };
  return JSON.stringify(msg);
}

export function parseVideoOrientation(
  raw: string,
): VideoOrientationMessage | null {
  try {
    const msg = JSON.parse(raw) as Partial<VideoOrientationMessage>;
    if (
      msg?.type !== VIDEO_ORIENTATION_MSG_TYPE ||
      typeof msg.userId !== 'string' ||
      !msg.userId.trim() ||
      typeof msg.rotationDeg !== 'number' ||
      !Number.isFinite(msg.rotationDeg)
    ) {
      return null;
    }
    return {
      type: VIDEO_ORIENTATION_MSG_TYPE,
      userId: msg.userId.trim(),
      rotationDeg: msg.rotationDeg,
    };
  } catch {
    return null;
  }
}
