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
    console.log('[enterLobby] start', {
      worldId,
      mode,
      typeofCreateTable: typeof createTable,
      typeofStartLoading: typeof startLoading,
      typeofRouterPush: typeof router.push,
    });

    const id = worldId.trim();
    if (!id) {
      console.log('[enterLobby] empty worldId — bail');
      return;
    }

    setError(null);

    if (mode === 'public') {
      console.log('[enterLobby] public push', id);
      router.push({
        pathname: '/(app)/lobby/[worldId]',
        params: { worldId: id, mode: 'public' },
      });
      return;
    }

    if (typeof createTable !== 'function') {
      console.log('[enterLobby] createTable is NOT a function', createTable);
      setError('createTable is not a function');
      return;
    }

    startLoading();
    try {
      console.log('[enterLobby] calling createTable', id);
      const table = await createTable({ worldId: id });
      console.log('[enterLobby] createTable ok', {
        id: table?.id,
        worldId: table?.worldId,
        private: table?.private,
        inviteCode: table?.inviteCode,
      });

      const code =
        typeof table.inviteCode === 'string' ? table.inviteCode.trim() : '';
      if (!code) {
        throw new Error('Missing invite code');
      }

      const nextWorld = (table.worldId || id).trim();
      console.log('[enterLobby] pushing lobby', { nextWorld, code });
      router.push({
        pathname: '/(app)/lobby/[worldId]',
        params: {
          worldId: nextWorld,
          mode: 'code',
          inviteCode: code,
        },
      });
      console.log('[enterLobby] push done');
    } catch (err) {
      console.log('[enterLobby] catch', err);
      setError(err instanceof Error ? err.message : 'Failed to start lobby');
    } finally {
      stopLoading();
      console.log('[enterLobby] finally');
    }
  };

  return { enter, loading, error } as const;
}
