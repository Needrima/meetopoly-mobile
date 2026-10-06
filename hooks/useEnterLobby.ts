import { useState } from 'react';
import { router } from 'expo-router';

// Import generated endpoint directly — avoid Metro `export *` Fast Refresh dropping
// new bindings from `@/api/services` (symptoms: "undefined is not a function").
import { createTable } from '@/api/generated/endpoints';
import { useLoading } from '@/hooks/useLoading';

export type LobbyEnterMode = 'public' | 'private';

/**
 * Phase 20.4 — Worlds Proceed: public → lobby join; private → create then lobby by code.
 * Create runs once here so lobby remounts resume via join-by-code (not a second CreatePrivate).
 */
export function useEnterLobby() {
  const { loading, startLoading, stopLoading } = useLoading();
  const [error, setError] = useState<string | null>(null);

  const enter = async (worldId: string, mode: LobbyEnterMode) => {
    const id = worldId.trim();
    if (!id) {
      return;
    }

    setError(null);

    if (mode === 'public') {
      router.push({
        pathname: '/(app)/lobby/[worldId]',
        params: { worldId: id, mode: 'public' },
      });
      return;
    }

    startLoading();
    try {
      const table = await createTable({ worldId: id });
      const code =
        typeof table.inviteCode === 'string' ? table.inviteCode.trim() : '';
      if (!code) {
        throw new Error('Missing invite code');
      }

      const nextWorld = (table.worldId || id).trim();
      router.push({
        pathname: '/(app)/lobby/[worldId]',
        params: {
          worldId: nextWorld,
          mode: 'code',
          inviteCode: code,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start lobby');
    } finally {
      stopLoading();
    }
  };

  return { enter, loading, error } as const;
}
