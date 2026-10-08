import { useRef } from 'react';

import type { GamePlayer } from '@/api/types';
import { presencePlayerSig } from '@/lib/presencePlayerSig';

/**
 * Phase 23.4 — recompute draw metadata only when presence-relevant player fields change
 * (not every game WS tick that only updates cash / timers).
 */
export function usePresencePlayerRevision(
  players: readonly GamePlayer[] | undefined,
): { presencePlayerSig: string; playersSnap: readonly GamePlayer[] } {
  const list = players ?? [];
  const sig = presencePlayerSig(list);
  const sigRef = useRef('');
  const snapRef = useRef<readonly GamePlayer[]>([]);

  if (sig !== sigRef.current) {
    sigRef.current = sig;
    snapRef.current = list;
  }

  return { presencePlayerSig: sig, playersSnap: snapRef.current };
}
