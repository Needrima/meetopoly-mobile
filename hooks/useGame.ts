import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiMutator, getWsBaseUrl } from "@/api/client";
import { getGame } from "@/api/services";
import type { Game } from "@/api/types";
import { queryKeys } from "@/api/queryKeys";
import { useSession } from "@/hooks/useSession";

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
  const id = gameId?.trim() ?? "";
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
      if (
        ws &&
        (ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING)
      ) {
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
  const id = gameId?.trim() ?? "";
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
        return Promise.reject(new Error("Missing game id"));
      }
      return apiMutator<Game>(`/games/${encodeURIComponent(id)}/roll`, {
        method: "POST",
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
        return Promise.reject(new Error("Missing game id"));
      }
      return apiMutator<Game>(`/games/${encodeURIComponent(id)}/end-turn`, {
        method: "POST",
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
        return Promise.reject(new Error("Missing game id"));
      }
      return apiMutator<Game>(`/games/${encodeURIComponent(id)}/resign`, {
        method: "POST",
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
        return Promise.reject(new Error("Missing game id"));
      }
      return apiMutator<Game>(`/games/${encodeURIComponent(id)}/buy`, {
        method: "POST",
      });
    },
    onSuccess,
  });
}

/** POST /games/{id}/pin-color — sync pin to avatar accent. */
export function useSetPinColor(gameId: string | null | undefined) {
  const { id, onSuccess } = useGameMutation(gameId);
  return useMutation<Game, Error, string>({
    mutationFn: (pinColor: string) => {
      if (!id) {
        return Promise.reject(new Error("Missing game id"));
      }
      return apiMutator<Game>(`/games/${encodeURIComponent(id)}/pin-color`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinColor }),
      });
    },
    onSuccess,
  });
}

/** POST /games/{id}/enter-hub — Phase 8.2 in-hub badge; 8.4 hubRevision stale guard. */
export function useEnterHub(gameId: string | null | undefined) {
  const { id, onSuccess } = useGameMutation(gameId);
  return useMutation<
    Game,
    Error,
    { hubId: string; hubRevision: number; signal?: AbortSignal }
  >({
    mutationFn: ({ hubId, hubRevision, signal }) => {
      if (!id) {
        return Promise.reject(new Error("Missing game id"));
      }
      return apiMutator<Game>(`/games/${encodeURIComponent(id)}/enter-hub`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hubId, hubRevision }),
        signal,
      });
    },
    onSuccess,
  });
}

/** POST /games/{id}/leave-hub — clear in-hub marker. */
export function useLeaveHub(gameId: string | null | undefined) {
  const { id, onSuccess } = useGameMutation(gameId);
  return useMutation<Game, Error, void>({
    mutationFn: () => {
      if (!id) {
        return Promise.reject(new Error("Missing game id"));
      }
      return apiMutator<Game>(`/games/${encodeURIComponent(id)}/leave-hub`, {
        method: "POST",
      });
    },
    onSuccess,
  });
}

/** POST /games/{id}/build — Phase 11.1 one house/hotel step. */
export function useBuildOnDeed(gameId: string | null | undefined) {
  const { id, onSuccess } = useGameMutation(gameId);
  return useMutation<Game, Error, number>({
    mutationFn: (boardIndex: number) => {
      if (!id) {
        return Promise.reject(new Error("Missing game id"));
      }
      return apiMutator<Game>(`/games/${encodeURIComponent(id)}/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardIndex }),
      });
    },
    onSuccess,
  });
}

/** POST /games/{id}/sell-building — Phase 11.2 one step down. */
export function useSellBuilding(gameId: string | null | undefined) {
  const { id, onSuccess } = useGameMutation(gameId);
  return useMutation<Game, Error, number>({
    mutationFn: (boardIndex: number) => {
      if (!id) {
        return Promise.reject(new Error("Missing game id"));
      }
      return apiMutator<Game>(
        `/games/${encodeURIComponent(id)}/sell-building`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ boardIndex }),
        },
      );
    },
    onSuccess,
  });
}

/** POST /games/{id}/mortgage — Phase 11.3. */
export function useMortgageDeed(gameId: string | null | undefined) {
  const { id, onSuccess } = useGameMutation(gameId);
  return useMutation<Game, Error, number>({
    mutationFn: (boardIndex: number) => {
      if (!id) {
        return Promise.reject(new Error("Missing game id"));
      }
      return apiMutator<Game>(`/games/${encodeURIComponent(id)}/mortgage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardIndex }),
      });
    },
    onSuccess,
  });
}

/** POST /games/{id}/redeem — Phase 11.3. */
export function useRedeemDeed(gameId: string | null | undefined) {
  const { id, onSuccess } = useGameMutation(gameId);
  return useMutation<Game, Error, number>({
    mutationFn: (boardIndex: number) => {
      if (!id) {
        return Promise.reject(new Error("Missing game id"));
      }
      return apiMutator<Game>(`/games/${encodeURIComponent(id)}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardIndex }),
      });
    },
    onSuccess,
  });
}

/** POST /games/{id}/pay-jail-fine — Phase 12.1/12.4 leave Jail for 100 MeetCoin. */
export function usePayJailFine(gameId: string | null | undefined) {
  const { id, onSuccess } = useGameMutation(gameId);
  return useMutation<Game, Error, void>({
    mutationFn: () => {
      if (!id) {
        return Promise.reject(new Error("Missing game id"));
      }
      return apiMutator<Game>(
        `/games/${encodeURIComponent(id)}/pay-jail-fine`,
        { method: "POST" },
      );
    },
    onSuccess,
  });
}

/** POST /games/{id}/use-jail-card — Phase 12.1/12.4 spend one GOOJF. */
export function useUseJailCard(gameId: string | null | undefined) {
  const { id, onSuccess } = useGameMutation(gameId);
  return useMutation<Game, Error, void>({
    mutationFn: () => {
      if (!id) {
        return Promise.reject(new Error("Missing game id"));
      }
      return apiMutator<Game>(
        `/games/${encodeURIComponent(id)}/use-jail-card`,
        { method: "POST" },
      );
    },
    onSuccess,
  });
}

/** POST /games/{id}/start-auction — Phase 13.0/13.1 decline buy → bank auction. */
export function useStartAuction(gameId: string | null | undefined) {
  const { id, onSuccess } = useGameMutation(gameId);
  return useMutation<Game, Error, void>({
    mutationFn: () => {
      if (!id) {
        return Promise.reject(new Error("Missing game id"));
      }
      return apiMutator<Game>(
        `/games/${encodeURIComponent(id)}/start-auction`,
        { method: "POST" },
      );
    },
    onSuccess,
  });
}

/** POST /games/{id}/auction/bid — Phase 13.0/13.1. */
export function useAuctionBid(gameId: string | null | undefined) {
  const { id, onSuccess } = useGameMutation(gameId);
  return useMutation<Game, Error, number>({
    mutationFn: (amount: number) => {
      if (!id) {
        return Promise.reject(new Error("Missing game id"));
      }
      return apiMutator<Game>(
        `/games/${encodeURIComponent(id)}/auction/bid`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount }),
        },
      );
    },
    onSuccess,
  });
}

/** POST /games/{id}/auction/fold — Phase 13.0/13.1. */
export function useAuctionFold(gameId: string | null | undefined) {
  const { id, onSuccess } = useGameMutation(gameId);
  return useMutation<Game, Error, void>({
    mutationFn: () => {
      if (!id) {
        return Promise.reject(new Error("Missing game id"));
      }
      return apiMutator<Game>(
        `/games/${encodeURIComponent(id)}/auction/fold`,
        { method: "POST" },
      );
    },
    onSuccess,
  });
}
