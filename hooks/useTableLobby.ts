import { useEffect, useRef, useState } from 'react';

import { getWsBaseUrl } from '@/api/client';
import {
  joinTable,
  leaveTable,
  setTableReady,
} from '@/api/services';
import type { Table, TableSeat } from '@/api/types';
import { useSession } from '@/hooks/useSession';

export const LOBBY_MAX_SEATS = 6;
export const LOBBY_MIN_SEATS = 2;
export const DISCONNECT_HOLD_MS = 45_000;

export type LobbySeat = {
  seatIndex: number;
  playerId: string | null;
  displayName: string | null;
  ready: boolean;
  isBot: boolean;
  isLocal: boolean;
  holding: boolean;
  holdEndsAt: number | null;
};

type TableEvent = {
  type: string;
  table?: Table;
  error?: string;
};

function seatFromApi(s: TableSeat, localPlayerId: string): LobbySeat {
  const holdEndsAt = s.holdEndsAt ? Date.parse(s.holdEndsAt) : null;
  return {
    seatIndex: s.seatIndex,
    playerId: s.userId ?? null,
    displayName: s.username ?? null,
    ready: s.ready,
    isBot: false,
    isLocal: Boolean(s.userId && s.userId === localPlayerId),
    holding: s.holding,
    holdEndsAt: Number.isFinite(holdEndsAt) ? holdEndsAt : null,
  };
}

function seatsFromTable(table: Table | null, localPlayerId: string): LobbySeat[] {
  if (!table) {
    return Array.from({ length: LOBBY_MAX_SEATS }, (_, i) => ({
      seatIndex: i,
      playerId: null,
      displayName: null,
      ready: false,
      isBot: false,
      isLocal: false,
      holding: false,
      holdEndsAt: null,
    }));
  }
  return table.seats.map((s) => seatFromApi(s, localPlayerId));
}

export type UseTableLobbyArgs = {
  worldId: string;
  localPlayerId: string;
};

/**
 * Phase 5.6 — real HTTP join + WebSocket seat sync (replaces useLobbyStub).
 */
export function useTableLobby({ worldId, localPlayerId }: UseTableLobbyArgs) {
  const { token } = useSession();
  const [table, setTable] = useState<Table | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(true);
  const [started, setStarted] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const wsRef = useRef<WebSocket | null>(null);
  const tableIdRef = useRef<string | null>(null);
  const intentionalLeave = useRef(false);

  useEffect(() => {
    if (!worldId || !token || !localPlayerId) {
      return;
    }
    let cancelled = false;
    intentionalLeave.current = false;
    setJoining(true);
    setError(null);
    setStarted(false);

    void (async () => {
      try {
        const joined = await joinTable({ worldId });
        if (cancelled) {
          return;
        }
        setTable(joined);
        tableIdRef.current = joined.id;
        setJoining(false);

        const ws = new WebSocket(
          `${getWsBaseUrl()}/ws/tables/${encodeURIComponent(joined.id)}?token=${encodeURIComponent(token)}`,
        );
        wsRef.current = ws;

        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(String(ev.data)) as TableEvent;
            if (msg.table) {
              setTable(msg.table);
            }
            if (msg.type === 'started' || msg.table?.status === 'starting' || msg.table?.status === 'in_game') {
              setStarted(true);
            }
            if (msg.type === 'error' && msg.error) {
              setError(msg.error);
            }
          } catch {
            // ignore malformed
          }
        };
        ws.onerror = () => {
          if (!cancelled) {
            setError('Lobby connection error');
          }
        };
      } catch (err) {
        if (!cancelled) {
          setJoining(false);
          setError(err instanceof Error ? err.message : 'Failed to join lobby');
        }
      }
    })();

    return () => {
      cancelled = true;
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      // Voluntary leave only when intentionalLeave; otherwise WS disconnect → server hold.
      if (intentionalLeave.current && tableIdRef.current) {
        void leaveTable(tableIdRef.current).catch(() => undefined);
      }
    };
  }, [worldId, token, localPlayerId]);

  useEffect(() => {
    const anyHolding = table?.seats.some((s) => s.holding);
    if (!anyHolding) {
      return;
    }
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [table]);

  const leave = () => {
    intentionalLeave.current = true;
    const id = tableIdRef.current;
    if (id) {
      void leaveTable(id).catch(() => undefined);
    }
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  };

  const toggleReady = () => {
    const id = tableIdRef.current;
    if (!id || !table) {
      return;
    }
    const local = table.seats.find((s) => s.userId === localPlayerId);
    if (!local || local.holding) {
      return;
    }
    void setTableReady(id, { ready: !local.ready })
      .then((next) => {
        setTable(next);
        if (next.gameId || next.status === 'in_game' || next.status === 'starting') {
          setStarted(true);
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Ready failed');
      });
  };

  const seats = seatsFromTable(table, localPlayerId);
  const seated = seats.filter((s) => s.playerId != null);
  const seatedCount = seated.length;
  const readyCount = seated.filter((s) => s.ready && !s.holding).length;
  const holdingCount = seated.filter((s) => s.holding).length;
  const waitingForPlayers = seatedCount < LOBBY_MIN_SEATS;
  const isFull = seatedCount >= LOBBY_MAX_SEATS;
  const localSeat = seats.find((s) => s.isLocal) ?? null;
  const localReady = Boolean(localSeat?.ready && !localSeat.holding);
  const localHolding = Boolean(localSeat?.holding);
  const canToggleReady = !waitingForPlayers && !localHolding && !joining;
  const allReady =
    Boolean(table?.gameId) &&
    (started ||
      table?.status === 'in_game' ||
      table?.status === 'starting');

  const holdRemainingFor = (holdEndsAt: number | null): number => {
    if (holdEndsAt == null) {
      return 0;
    }
    return Math.max(0, Math.ceil((holdEndsAt - nowMs) / 1000));
  };

  return {
    tableId: table?.id ?? null,
    gameId: table?.gameId ?? null,
    seats,
    seatedCount,
    readyCount,
    holdingCount,
    waitingForPlayers,
    isFull,
    localReady,
    localHolding,
    holdRemainingSec: holdRemainingFor(localSeat?.holdEndsAt ?? null),
    holdExpired: false,
    canToggleReady,
    allReady,
    joining,
    error,
    minSeats: LOBBY_MIN_SEATS,
    maxSeats: LOBBY_MAX_SEATS,
    holdMs: DISCONNECT_HOLD_MS,
    holdRemainingFor,
    toggleReady,
    leave,
  };
}
