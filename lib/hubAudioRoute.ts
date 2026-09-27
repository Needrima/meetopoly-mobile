/**
 * Phase 10 — route presence WebRTC audio to the device loudspeaker (hub + board).
 * Dynamic require so Expo Go / missing native module does not crash the app.
 */

type InCallManagerLike = {
  start: (setup?: { media?: "audio" | "video"; auto?: boolean }) => void;
  stop: (setup?: object) => void;
  setForceSpeakerphoneOn: (flag: boolean) => void;
};

let sessionActive = false;

function loadInCallManager(): InCallManagerLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-incall-manager") as {
      default?: InCallManagerLike;
    };
    return mod.default ?? (mod as unknown as InCallManagerLike);
  } catch (err) {
    console.warn("[hubAudio] react-native-incall-manager unavailable", err);
    return null;
  }
}

/** Start an audio session and force loudspeaker (hub / board voice). */
export function startHubSpeaker(): void {
  const mgr = loadInCallManager();
  if (!mgr) {
    return;
  }
  try {
    if (!sessionActive) {
      mgr.start({ media: "audio" });
      sessionActive = true;
    }
    // true = force speaker; false = default; -not used- release force
    mgr.setForceSpeakerphoneOn(true);
  } catch (err) {
    console.warn("[hubAudio] startHubSpeaker failed", err);
  }
}

/** Restore default audio routing when leaving hub / board presence. */
export function stopHubSpeaker(): void {
  if (!sessionActive) {
    return;
  }
  const mgr = loadInCallManager();
  sessionActive = false;
  if (!mgr) {
    return;
  }
  try {
    mgr.setForceSpeakerphoneOn(false);
    mgr.stop();
  } catch (err) {
    console.warn("[hubAudio] stopHubSpeaker failed", err);
  }
}
