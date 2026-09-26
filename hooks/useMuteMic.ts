import { useCallback, useEffect, useState } from 'react';

import { getSecureItem, setSecureItem } from '@/api/sessionStore';

/**
 * Phase 9.2 — local mute preference (no audio until Phase 10).
 * When true, mic should stay off once voice ships.
 */
export function useMuteMic(): {
  muted: boolean;
  ready: boolean;
  setMuted: (next: boolean) => void;
} {
  const [muted, setMutedState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const raw = await getSecureItem('muteMic');
        if (alive) {
          setMutedState(raw === '1');
        }
      } finally {
        if (alive) {
          setReady(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next);
    void setSecureItem('muteMic', next ? '1' : '0');
  }, []);

  return { muted, ready, setMuted };
}
