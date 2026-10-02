/**
 * iOS board-camera upright via react-native-webrtc VideoFrameProcessor.
 *
 * Front: always `meetopolyCamRot` (+90) — works on existing iOS clients.
 * Back: `meetopolyCamRotBack` (+270) only when native `hasBackCamEffect()` is true
 * (new rebuild). Never call an unknown effect name — that clears processors and
 * regresses front to sideways.
 */

import { NativeModulesProxy, requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

/** Legacy + front facing — do not rename. */
export const MEETOPOLY_BOARD_CAM_EFFECT = 'meetopolyCamRot';
export const MEETOPOLY_BOARD_CAM_EFFECT_BACK = 'meetopolyCamRotBack';

export type BoardCamFacing = 'user' | 'environment';

type BoardCamModule = {
  effectName: () => string;
  hasBackCamEffect?: () => boolean;
  effectNameForFacing?: (facing: string) => string;
};

function getNative(): BoardCamModule | null {
  if (Platform.OS !== 'ios') {
    return null;
  }
  try {
    return requireNativeModule<BoardCamModule>('MeetopolyBoardCam');
  } catch {
    try {
      const proxy = NativeModulesProxy.MeetopolyBoardCam as
        | BoardCamModule
        | undefined;
      return proxy ?? null;
    } catch {
      return null;
    }
  }
}

/** True when the native module is linked. */
export function isMeetopolyBoardCamNativeAvailable(): boolean {
  return getNative() != null;
}

/**
 * True only after a native rebuild that registers `meetopolyCamRotBack`.
 * Old clients lack this function → false → JS keeps using front effect only.
 */
export function hasMeetopolyBoardCamBackEffect(): boolean {
  const native = getNative();
  if (!native?.hasBackCamEffect) {
    return false;
  }
  try {
    return Boolean(native.hasBackCamEffect());
  } catch {
    return false;
  }
}

export function meetopolyBoardCamEffectName(
  facing: BoardCamFacing = 'user',
): string {
  if (facing === 'environment' && hasMeetopolyBoardCamBackEffect()) {
    const native = getNative();
    if (native?.effectNameForFacing) {
      try {
        return (
          native.effectNameForFacing(facing) || MEETOPOLY_BOARD_CAM_EFFECT_BACK
        );
      } catch {
        // fall through
      }
    }
    return MEETOPOLY_BOARD_CAM_EFFECT_BACK;
  }
  // Front, or back on an old client that only has meetopolyCamRot.
  return MEETOPOLY_BOARD_CAM_EFFECT;
}

type TrackWithEffect = {
  kind?: string;
  _setVideoEffect?: (name: string) => void;
};

/**
 * Tag local iOS camera frames with landscape rotation metadata.
 * Pass facing so back uses `meetopolyCamRotBack` when the binary supports it.
 */
export function applyMeetopolyBoardCamEffect(
  track: TrackWithEffect | null | undefined,
  facing: BoardCamFacing = 'user',
): boolean {
  if (Platform.OS !== 'ios' || !track || track.kind !== 'video') {
    return false;
  }
  if (!isMeetopolyBoardCamNativeAvailable()) {
    return false;
  }
  if (typeof track._setVideoEffect !== 'function') {
    return false;
  }
  const name = meetopolyBoardCamEffectName(facing);
  // Refuse unknown back name on old clients (would clear processors → sideways).
  if (
    facing === 'environment' &&
    name === MEETOPOLY_BOARD_CAM_EFFECT_BACK &&
    !hasMeetopolyBoardCamBackEffect()
  ) {
    return false;
  }
  try {
    track._setVideoEffect(name);
    return true;
  } catch (err) {
    console.warn('[meetopoly-board-cam] setVideoEffect failed', err);
    return false;
  }
}
