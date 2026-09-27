import { useCallback, useEffect, useState } from 'react';

import { getSecureItem, setSecureItem } from '@/api/sessionStore';

type MuteListener = (muted: boolean) => void;

const muteListeners = new Set<MuteListener>();
let muteCache: boolean | null = null;
let muteLoad: Promise<boolean> | null = null;

function notifyMuteListeners(next: boolean) {
  muteCache = next;
  for (const listener of muteListeners) {
    listener(next);
  }
}

async function loadMuteMic(): Promise<boolean> {
  if (muteCache !== null) {
    return muteCache;
  }
  if (!muteLoad) {
    muteLoad = (async () => {
      try {
        const raw = await getSecureItem('muteMic');
        const muted = raw === '1';
        muteCache = muted;
        return muted;
      } catch {
        muteCache = false;
        return false;
      } finally {
        muteLoad = null;
      }
    })();
  }
  return muteLoad;
}

/**
 * Phase 9.2 / 10.1 — local mute preference (SecureStore `muteMic`).
 * When true, hub mic tracks stay disabled (`enabled=false`).
 * Shared cache so Settings + hub presence stay in sync.
 */
export function useMuteMic(): {
  muted: boolean;
  ready: boolean;
  setMuted: (next: boolean) => void;
} {
  const [muted, setMutedState] = useState(() => muteCache ?? false);
  const [ready, setReady] = useState(() => muteCache !== null);

  useEffect(() => {
    let alive = true;
    const onChange: MuteListener = (next) => {
      if (alive) {
        setMutedState(next);
      }
    };
    muteListeners.add(onChange);
    void (async () => {
      const value = await loadMuteMic();
      if (alive) {
        setMutedState(value);
        setReady(true);
      }
    })();
    return () => {
      alive = false;
      muteListeners.delete(onChange);
    };
  }, []);

  const setMuted = useCallback((next: boolean) => {
    void setSecureItem('muteMic', next ? '1' : '0');
    notifyMuteListeners(next);
  }, []);

  return { muted, ready, setMuted };
}
