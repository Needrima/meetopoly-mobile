import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiMutator, getWsBaseUrl } from '@/api/client';
import { getGame } from '@/api/services';
import type { Game } from '@/api/types';
import { queryKeys } from '@/api/queryKeys';
import { useSession } from '@/hooks/useSession';

type GameEvent = {
  type: string;
  game?: Game;
  error?: string;
};

/**
 * Authoritative game snapshot: initial HTTP fetch + WebSocket push into Query cache.
 * Polls only as a slow fallback while the socket is down.
 */
export function useGame(gameId: string | null | undefined) {
  const { token } = useSession();
  const queryClient = useQueryClient();
  const id = gameId?.trim() ?? '';
  const [wsLive, setWsLive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token || !id) {
      setWsLive(false);
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    const connect = () => {
      if (cancelled) {
        return;
      }
      const ws = new WebSocket(
        `${getWsBaseUrl()}/ws/games/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`,
      );
      wsRef.current = ws;

      ws.onopen = () => {
        if (!cancelled) {
          attempt = 0;
          setWsLive(true);
        }
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as GameEvent;
          if (msg.game) {
            queryClient.setQueryData(queryKeys.game(id), msg.game);
          }
        } catch {
          // ignore malformed
        }
      };
      ws.onerror = () => {
        // onclose handles reconnect
      };
      ws.onclose = () => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        if (cancelled) {
          return;
        }
        setWsLive(false);
        const delay = Math.min(8_000, 500 * 2 ** attempt);
        attempt += 1;
        retryTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
      setWsLive(false);
    };
  }, [token, id, queryClient]);

  return useQuery<Game, Error>({
    queryKey: queryKeys.game(id),
    enabled: Boolean(token) && id.length > 0,
    queryFn: () => getGame(id),
    staleTime: 30_000,
    // Slow HTTP fallback only while WS is disconnected.
    refetchInterval: wsLive ? false : 5_000,
  });
}

function useGameMutation(gameId: string | null | undefined) {
  const queryClient = useQueryClient();
  const id = gameId?.trim() ?? '';
  return {
    id,
    onSuccess: (game: Game) => {
      queryClient.setQueryData(queryKeys.game(id), game);
    },
  };
}

/** POST /games/{id}/roll — call mutator directly (avoid Metro export* / stale binding issues). */
export function useRollDice(gameId: string | null | undefined) {
  const { id, onSuccess } = useGameMutation(gameId);
  return useMutation<Game, Error, void>({
    mutationFn: () => {
      if (!id) {
        return Promise.reject(new Error('Missing game id'));
      }
      return apiMutator<Game>(`/games/${encodeURIComponent(id)}/roll`, {
        method: 'POST',
      });
    },
    onSuccess,
  });
}

/** POST /games/{id}/end-turn */
export function useEndTurn(gameId: string | null | undefined) {
  const { id, onSuccess } = useGameMutation(gameId);
  return useMutation<Game, Error, void>({
    mutationFn: () => {
      if (!id) {
        return Promise.reject(new Error('Missing game id'));
      }
      return apiMutator<Game>(`/games/${encodeURIComponent(id)}/end-turn`, {
        method: 'POST',
      });
    },
    onSuccess,
  });
}

/** POST /games/{id}/resign — Phase 6.2c leave mid-game. */
export function useResignGame(gameId: string | null | undefined) {
  const { id, onSuccess } = useGameMutation(gameId);
  return useMutation<Game, Error, void>({
    mutationFn: () => {
      if (!id) {
        return Promise.reject(new Error('Missing game id'));
      }
      return apiMutator<Game>(`/games/${encodeURIComponent(id)}/resign`, {
        method: 'POST',
      });
    },
    onSuccess,
  });
}

/** POST /games/{id}/buy — Phase 6.4 buy at list price. */
export function useBuyProperty(gameId: string | null | undefined) {
  const { id, onSuccess } = useGameMutation(gameId);
  return useMutation<Game, Error, void>({
    mutationFn: () => {
      if (!id) {
        return Promise.reject(new Error('Missing game id'));
      }
      return apiMutator<Game>(`/games/${encodeURIComponent(id)}/buy`, {
        method: 'POST',
      });
    },
    onSuccess,
  });
}
