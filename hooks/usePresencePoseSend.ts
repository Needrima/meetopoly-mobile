import { useEffect, useRef } from 'react';

/** Phase 7 / 22.4 — walking publish rate (~10 Hz). */
export const POSE_SEND_WALK_MS = 100;
/** Phase 22.4 — idle / heavy-turn publish rate (~3 Hz). */
export const POSE_SEND_IDLE_MS = 333;

/** Match board/hub stick deadzone so idle ≠ micro-drift spam. */
export const POSE_WALK_STICK_EPS = 0.04;

type NormPose = { x: number; y: number };

type UsePresencePoseSendOpts = {
  enabled: boolean;
  getNormPose: () => NormPose;
  sendPose: (pose: NormPose) => void;
  /** Joystick actively deflecting. */
  isWalking: () => boolean;
  /**
   * When true, force idle rate (roller dice hold / pin walk) even if stick is
   * down — cuts DC churn on the busy device.
   */
  preferIdle?: () => boolean;
};

/**
 * Phase 22.4 — adaptive presence pose fan-out.
 * Walk: 10 Hz; idle or heavy turn cinema: ~3 Hz.
 */
export function usePresencePoseSend({
  enabled,
  getNormPose,
  sendPose,
  isWalking,
  preferIdle,
}: UsePresencePoseSendOpts): void {
  const getNormPoseRef = useRef(getNormPose);
  getNormPoseRef.current = getNormPose;
  const sendPoseRef = useRef(sendPose);
  sendPoseRef.current = sendPose;
  const isWalkingRef = useRef(isWalking);
  isWalkingRef.current = isWalking;
  const preferIdleRef = useRef(preferIdle);
  preferIdleRef.current = preferIdle;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let intervalMs = POSE_SEND_WALK_MS;
    let id: ReturnType<typeof setInterval> | null = null;

    const clear = () => {
      if (id != null) {
        clearInterval(id);
        id = null;
      }
    };

    const targetMs = () => {
      const walking = isWalkingRef.current();
      const forceIdle = preferIdleRef.current?.() ?? false;
      return walking && !forceIdle ? POSE_SEND_WALK_MS : POSE_SEND_IDLE_MS;
    };

    const run = () => {
      const next = targetMs();
      try {
        sendPoseRef.current(getNormPoseRef.current());
      } catch (err) {
        console.warn('[presence] adaptive pose send failed', err);
      }
      if (next !== intervalMs) {
        intervalMs = next;
        clear();
        id = setInterval(run, intervalMs);
      }
    };

    intervalMs = targetMs();
    run();
    id = setInterval(run, intervalMs);
    return clear;
  }, [enabled]);
}
