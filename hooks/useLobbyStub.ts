import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/** Hard table capacity (locked Phase 5). */
export const LOBBY_MAX_SEATS = 6;
/** Cannot start / Ready until at least this many seated. */
export const LOBBY_MIN_SEATS = 2;
/** Seat hold after disconnect before freeing (stub mid of 30–60s). */
export const DISCONNECT_HOLD_MS = 45_000;

/** Delay between fake joiners (ms). */
const BOT_JOIN_MS = 3200;
/** Delay after a bot sits before they auto-Ready. */
const BOT_READY_MS = 1800;
/** After first bot Readys, simulate a disconnect so hold UI is demoable. */
const BOT_DISCONNECT_AFTER_READY_MS = 10_000;

const BOT_NAMES = [
  'Mara',
  'Kenji',
  'Ayo',
  'Sofia',
  'Lars',
  'Priya',
  'Noor',
  'Diego',
] as const;

export type LobbySeat = {
  seatIndex: number;
  playerId: string | null;
  displayName: string | null;
  ready: boolean;
  isBot: boolean;
  isLocal: boolean;
  /** True while disconnect hold is active. */
  holding: boolean;
  /** Epoch ms when hold expires; null if not holding. */
  holdEndsAt: number | null;
};

export type UseLobbyStubArgs = {
  worldId: string;
  localPlayerId: string;
  localDisplayName: string;
};

function emptySeat(seatIndex: number): LobbySeat {
  return {
    seatIndex,
    playerId: null,
    displayName: null,
    ready: false,
    isBot: false,
    isLocal: false,
    holding: false,
    holdEndsAt: null,
  };
}

function emptySeats(): LobbySeat[] {
  return Array.from({ length: LOBBY_MAX_SEATS }, (_, i) => emptySeat(i));
}

function occupied(seats: LobbySeat[]): LobbySeat[] {
  return seats.filter((s) => s.playerId != null);
}

function seatLocal(
  seats: LobbySeat[],
  playerId: string,
  displayName: string,
): LobbySeat[] {
  if (seats.some((s) => s.playerId === playerId)) {
    return seats.map((s) =>
      s.playerId === playerId
        ? {
            ...s,
            displayName,
            isLocal: true,
            holding: false,
            holdEndsAt: null,
          }
        : { ...s, isLocal: false },
    );
  }
  const open = seats.findIndex((s) => s.playerId == null);
  if (open < 0) {
    return seats;
  }
  return seats.map((s, i) =>
    i === open
      ? {
          ...emptySeat(i),
          playerId,
          displayName,
          isLocal: true,
        }
      : { ...s, isLocal: false },
  );
}

function freePlayer(seats: LobbySeat[], playerId: string): LobbySeat[] {
  return seats.map((s) =>
    s.playerId === playerId ? emptySeat(s.seatIndex) : s,
  );
}

function beginHold(
  seats: LobbySeat[],
  playerId: string,
  holdEndsAt: number,
): LobbySeat[] {
  return seats.map((s) =>
    s.playerId === playerId
      ? { ...s, holding: true, holdEndsAt, ready: false }
      : s,
  );
}

function endHold(seats: LobbySeat[], playerId: string): LobbySeat[] {
  return seats.map((s) =>
    s.playerId === playerId
      ? { ...s, holding: false, holdEndsAt: null }
      : s,
  );
}

function seatBotJoiner(seats: LobbySeat[], botOrdinal: number): LobbySeat[] {
  const open = seats.findIndex((s) => s.playerId == null);
  if (open < 0) {
    return seats;
  }
  const taken = new Set(
    seats.filter((s) => s.displayName).map((s) => s.displayName!.toLowerCase()),
  );
  const name =
    BOT_NAMES.find((n) => !taken.has(n.toLowerCase())) ?? `Guest ${botOrdinal}`;
  const playerId = `bot-${botOrdinal}`;

  return seats.map((s, i) =>
    i === open
      ? {
          ...emptySeat(i),
          playerId,
          displayName: name,
          isBot: true,
        }
      : s,
  );
}

function everyoneReady(seats: LobbySeat[]): boolean {
  const seated = occupied(seats);
  return (
    seated.length >= LOBBY_MIN_SEATS &&
    seated.every((s) => s.ready && !s.holding)
  );
}

/**
 * Phase 5.2–5.5 local lobby stub (bots). Prefer `useTableLobby` (5.6+) for real matchmaking.
 */
export function useLobbyStub({
  worldId,
  localPlayerId,
  localDisplayName,
}: UseLobbyStubArgs) {
  const [seats, setSeats] = useState<LobbySeat[]>(emptySeats);
  const [holdExpired, setHoldExpired] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const botOrdinalRef = useRef(0);
  const scheduledReadyRef = useRef(new Set<string>());
  const readyTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const holdTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const botDisconnectScheduledRef = useRef(new Set<string>());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const localPlayerIdRef = useRef(localPlayerId);
  localPlayerIdRef.current = localPlayerId;

  const clearReadyTimers = () => {
    for (const t of readyTimersRef.current) {
      clearTimeout(t);
    }
    readyTimersRef.current = [];
    scheduledReadyRef.current.clear();
  };

  const clearHoldTimer = (playerId: string) => {
    const t = holdTimersRef.current.get(playerId);
    if (t) {
      clearTimeout(t);
      holdTimersRef.current.delete(playerId);
    }
  };

  const clearAllHoldTimers = () => {
    for (const t of holdTimersRef.current.values()) {
      clearTimeout(t);
    }
    holdTimersRef.current.clear();
  };

  const startHoldRef = useRef((playerId: string) => {
    clearHoldTimer(playerId);
    const holdEndsAt = Date.now() + DISCONNECT_HOLD_MS;
    setSeats((prev) => beginHold(prev, playerId, holdEndsAt));
    const t = setTimeout(() => {
      holdTimersRef.current.delete(playerId);
      setSeats((prev) => freePlayer(prev, playerId));
      if (playerId === localPlayerIdRef.current) {
        setHoldExpired(true);
      }
    }, DISCONNECT_HOLD_MS);
    holdTimersRef.current.set(playerId, t);
  });

  const cancelHoldRef = useRef((playerId: string) => {
    clearHoldTimer(playerId);
    setSeats((prev) => endHold(prev, playerId));
    if (playerId === localPlayerIdRef.current) {
      setHoldExpired(false);
    }
  });

  useEffect(() => {
    botOrdinalRef.current = 0;
    botDisconnectScheduledRef.current.clear();
    clearReadyTimers();
    clearAllHoldTimers();
    setHoldExpired(false);
    setSeats(seatLocal(emptySeats(), localPlayerId, localDisplayName));

    const joinTimer = setInterval(() => {
      setSeats((prev) => {
        if (everyoneReady(prev)) {
          return prev;
        }
        const filled = occupied(prev).length;
        if (filled >= LOBBY_MAX_SEATS) {
          return prev;
        }
        botOrdinalRef.current += 1;
        return seatBotJoiner(prev, botOrdinalRef.current);
      });
    }, BOT_JOIN_MS);

    return () => {
      clearInterval(joinTimer);
      clearReadyTimers();
      clearAllHoldTimers();
      setSeats(emptySeats());
    };
  }, [worldId, localPlayerId, localDisplayName]);

  // Bots auto-Ready after a short delay once the table has ≥2 seated.
  useEffect(() => {
    const seated = occupied(seats);
    if (seated.length < LOBBY_MIN_SEATS) {
      return;
    }
    for (const seat of seated) {
      if (!seat.isBot || !seat.playerId || seat.ready || seat.holding) {
        continue;
      }
      if (scheduledReadyRef.current.has(seat.playerId)) {
        continue;
      }
      scheduledReadyRef.current.add(seat.playerId);
      const playerId = seat.playerId;
      const t = setTimeout(() => {
        setSeats((prev) =>
          prev.map((s) =>
            s.playerId === playerId && !s.holding
              ? { ...s, ready: true }
              : s,
          ),
        );
      }, BOT_READY_MS);
      readyTimersRef.current.push(t);
    }
  }, [seats]);

  // Demo: first bot briefly disconnects after Ready so hold chrome is visible.
  useEffect(() => {
    for (const seat of seats) {
      if (
        seat.seatIndex !== 1 ||
        !seat.isBot ||
        !seat.playerId ||
        !seat.ready ||
        seat.holding ||
        botDisconnectScheduledRef.current.has(seat.playerId)
      ) {
        continue;
      }
      botDisconnectScheduledRef.current.add(seat.playerId);
      const playerId = seat.playerId;
      const t = setTimeout(() => {
        startHoldRef.current(playerId);
      }, BOT_DISCONNECT_AFTER_READY_MS);
      readyTimersRef.current.push(t);
      break;
    }
  }, [seats]);

  // Local disconnect hold when the app backgrounds (voluntary Leave is immediate).
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      const id = localPlayerIdRef.current;

      if (next === 'background' && prev !== 'background') {
        startHoldRef.current(id);
        return;
      }
      if (next === 'active' && prev === 'background') {
        cancelHoldRef.current(id);
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => {
      sub.remove();
    };
  }, []);

  // Tick countdown while any seat is holding.
  useEffect(() => {
    const anyHolding = seats.some((s) => s.holding);
    if (!anyHolding) {
      return;
    }
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [seats]);

  const leave = () => {
    clearHoldTimer(localPlayerId);
    setSeats((prev) => freePlayer(prev, localPlayerId));
    setHoldExpired(false);
  };

  const toggleReady = () => {
    setSeats((prev) => {
      if (occupied(prev).length < LOBBY_MIN_SEATS) {
        return prev;
      }
      const local = prev.find((s) => s.playerId === localPlayerId);
      if (!local || local.holding) {
        return prev;
      }
      return prev.map((s) =>
        s.playerId === localPlayerId ? { ...s, ready: !s.ready } : s,
      );
    });
  };

  const seated = occupied(seats);
  const seatedCount = seated.length;
  const readyCount = seated.filter((s) => s.ready && !s.holding).length;
  const waitingForPlayers = seatedCount < LOBBY_MIN_SEATS;
  const isFull = seatedCount >= LOBBY_MAX_SEATS;
  const localSeat = seats.find((s) => s.playerId === localPlayerId) ?? null;
  const localReady = Boolean(localSeat?.ready && !localSeat.holding);
  const localHolding = Boolean(localSeat?.holding);
  const canToggleReady = !waitingForPlayers && !localHolding;
  const allReady = everyoneReady(seats);
  const holdingCount = seated.filter((s) => s.holding).length;

  const seatsWithCountdown = seats.map((s) => {
    if (!s.holding || s.holdEndsAt == null) {
      return s;
    }
    return s;
  });

  const holdRemainingFor = (holdEndsAt: number | null): number => {
    if (holdEndsAt == null) {
      return 0;
    }
    return Math.max(0, Math.ceil((holdEndsAt - nowMs) / 1000));
  };

  return {
    seats: seatsWithCountdown,
    seatedCount,
    readyCount,
    holdingCount,
    waitingForPlayers,
    isFull,
    localReady,
    localHolding,
    holdRemainingSec: holdRemainingFor(localSeat?.holdEndsAt ?? null),
    holdExpired,
    canToggleReady,
    allReady,
    minSeats: LOBBY_MIN_SEATS,
    maxSeats: LOBBY_MAX_SEATS,
    holdMs: DISCONNECT_HOLD_MS,
    holdRemainingFor,
    toggleReady,
    leave,
  };
}
