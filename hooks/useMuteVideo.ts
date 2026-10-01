import { useCallback, useEffect, useState } from 'react';

import { getSecureItem, setSecureItem } from '@/api/sessionStore';

type MuteVideoListener = (muted: boolean) => void;

const muteVideoListeners = new Set<MuteVideoListener>();
let muteVideoCache: boolean | null = null;
let muteVideoLoad: Promise<boolean> | null = null;

function notifyMuteVideoListeners(next: boolean) {
  muteVideoCache = next;
  for (const listener of muteVideoListeners) {
    listener(next);
  }
}

async function loadMuteVideo(): Promise<boolean> {
  if (muteVideoCache !== null) {
    return muteVideoCache;
  }
  if (!muteVideoLoad) {
    muteVideoLoad = (async () => {
      try {
        const raw = await getSecureItem('muteVideo');
        const muted = raw === '1';
        muteVideoCache = muted;
        return muted;
      } catch {
        muteVideoCache = false;
        return false;
      } finally {
        muteVideoLoad = null;
      }
    })();
  }
  return muteVideoLoad;
}

/**
 * Phase 16.1 — local board camera preference (SecureStore `muteVideo`).
 * When true, local video tracks stay `enabled=false` (black / AvatarPod in UI).
 * Default false = camera on. Shared cache so Settings + board presence stay in sync.
 */
export function useMuteVideo(): {
  muted: boolean;
  ready: boolean;
  setMuted: (next: boolean) => void;
} {
  const [muted, setMutedState] = useState(() => muteVideoCache ?? false);
  const [ready, setReady] = useState(() => muteVideoCache !== null);

  useEffect(() => {
    let alive = true;
    const onChange: MuteVideoListener = (next) => {
      if (alive) {
        setMutedState(next);
      }
    };
    muteVideoListeners.add(onChange);
    void (async () => {
      const value = await loadMuteVideo();
      if (alive) {
        setMutedState(value);
        setReady(true);
      }
    })();
    return () => {
      alive = false;
      muteVideoListeners.delete(onChange);
    };
  }, []);

  const setMuted = useCallback((next: boolean) => {
    void setSecureItem('muteVideo', next ? '1' : '0');
    notifyMuteVideoListeners(next);
  }, []);

  return { muted, ready, setMuted };
}
