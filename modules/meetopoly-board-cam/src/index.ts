/**
 * iOS board-camera upright via react-native-webrtc VideoFrameProcessor.
 * Native module registers `meetopolyCamRot`; call `applyMeetopolyBoardCamEffect`
 * on local video tracks after getUserMedia / flip.
 *
 * Requires a rebuilt iOS dev client (expo prebuild + run) after adding this module.
 */

import { NativeModulesProxy, requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export const MEETOPOLY_BOARD_CAM_EFFECT = 'meetopolyCamRot';

type BoardCamModule = {
  effectName: () => string;
};

function getNative(): BoardCamModule | null {
  if (Platform.OS !== 'ios') {
    return null;
  }
  try {
    return requireNativeModule<BoardCamModule>('MeetopolyBoardCam');
  } catch {
    try {
      const proxy = NativeModulesProxy.MeetopolyBoardCam as BoardCamModule | undefined;
      return proxy ?? null;
    } catch {
      return null;
    }
  }
}

/** True when the native processor is linked (rebuilt iOS client). */
export function isMeetopolyBoardCamNativeAvailable(): boolean {
  return getNative() != null;
}

export function meetopolyBoardCamEffectName(): string {
  const native = getNative();
  if (native?.effectName) {
    try {
      return native.effectName() || MEETOPOLY_BOARD_CAM_EFFECT;
    } catch {
      // fall through
    }
  }
  return MEETOPOLY_BOARD_CAM_EFFECT;
}

type TrackWithEffect = {
  kind?: string;
  _setVideoEffect?: (name: string) => void;
};

/**
 * Tag local iOS camera frames with landscape rotation metadata so Android
 * SurfaceViewRenderer shows them upright (CSS rotate cannot).
 */
export function applyMeetopolyBoardCamEffect(track: TrackWithEffect | null | undefined): boolean {
  if (Platform.OS !== 'ios' || !track || track.kind !== 'video') {
    return false;
  }
  if (!isMeetopolyBoardCamNativeAvailable()) {
    return false;
  }
  if (typeof track._setVideoEffect !== 'function') {
    return false;
  }
  try {
    track._setVideoEffect(meetopolyBoardCamEffectName());
    return true;
  } catch (err) {
    console.warn('[meetopoly-board-cam] setVideoEffect failed', err);
    return false;
  }
}
