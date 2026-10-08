import { useRef } from 'react';

import { presenceRosterSig } from '@/lib/presenceRosterSig';

type RosterEntry = {
  userId: string;
  username: string;
  avatarUrl?: string;
};

/**
 * Phase 23.4 — hub draw metadata only when roster identity fields change.
 */
export function usePresenceRosterRevision(
  roster: readonly RosterEntry[] | undefined,
): { rosterSig: string; rosterSnap: readonly RosterEntry[] } {
  const list = roster ?? [];
  const sig = presenceRosterSig(list);
  const sigRef = useRef('');
  const snapRef = useRef<readonly RosterEntry[]>([]);

  if (sig !== sigRef.current) {
    sigRef.current = sig;
    snapRef.current = list;
  }

  return { rosterSig: sig, rosterSnap: snapRef.current };
}
