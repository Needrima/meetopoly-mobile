import { useEffect, useRef, useState } from 'react';

/** Hard table capacity (locked Phase 5). */
export const LOBBY_MAX_SEATS = 6;
/** Cannot start / Ready until at least this many seated. */
export const LOBBY_MIN_SEATS = 2;

/** Delay between fake joiners (ms). */
const BOT_JOIN_MS = 3200;
/** Delay after a bot sits before they auto-Ready. */
const BOT_READY_MS = 1800;

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
};

export type UseLobbyStubArgs = {
  worldId: string;
  localPlayerId: string;
  localDisplayName: string;
};

function emptySeats(): LobbySeat[] {
  return Array.from({ length: LOBBY_MAX_SEATS }, (_, i) => ({
    seatIndex: i,
    playerId: null,
    displayName: null,
    ready: false,
    isBot: false,
    isLocal: false,
  }));
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
        ? { ...s, displayName, isLocal: true }
        : { ...s, isLocal: false },
    );
  }
  const open = seats.findIndex((s) => s.playerId == null);
  if (open < 0) {
    return seats;
  }
  // Newcomer unready; leave everyone else's ready as-is.
  return seats.map((s, i) =>
    i === open
      ? {
          ...s,
          playerId,
          displayName,
          ready: false,
          isBot: false,
          isLocal: true,
        }
      : { ...s, isLocal: false },
  );
}

function clearLocal(seats: LobbySeat[], playerId: string): LobbySeat[] {
  return seats.map((s) =>
    s.playerId === playerId
      ? {
          seatIndex: s.seatIndex,
          playerId: null,
          displayName: null,
          ready: false,
          isBot: false,
          isLocal: false,
        }
      : s,
  );
}

/**
 * Seat a fake joiner in the first open slot.
 * Newcomer starts unready; existing Ready flags are kept (locked Phase 5 rule).
 */
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
          ...s,
          playerId,
          displayName: name,
          ready: false,
          isBot: true,
          isLocal: false,
        }
      : s,
  );
}

function everyoneReady(seats: LobbySeat[]): boolean {
  const seated = occupied(seats);
  return (
    seated.length >= LOBBY_MIN_SEATS && seated.every((s) => s.ready)
  );
}

/**
 * Phase 5.2+ local lobby stub (replaced by real table WS in 5.6).
 * 5.2 local seat · 5.3 bot joiners · 5.4 Ready + auto-Ready → board.
 */
export function useLobbyStub({
  worldId,
  localPlayerId,
  localDisplayName,
}: UseLobbyStubArgs) {
  const [seats, setSeats] = useState<LobbySeat[]>(emptySeats);
  const botOrdinalRef = useRef(0);
  const scheduledReadyRef = useRef(new Set<string>());
  const readyTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearReadyTimers = () => {
    for (const t of readyTimersRef.current) {
      clearTimeout(t);
    }
    readyTimersRef.current = [];
    scheduledReadyRef.current.clear();
  };

  useEffect(() => {
    botOrdinalRef.current = 0;
    clearReadyTimers();
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
      if (!seat.isBot || !seat.playerId || seat.ready) {
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
            s.playerId === playerId ? { ...s, ready: true } : s,
          ),
        );
      }, BOT_READY_MS);
      readyTimersRef.current.push(t);
    }
  }, [seats]);

  const leave = () => {
    setSeats((prev) => clearLocal(prev, localPlayerId));
  };

  const toggleReady = () => {
    setSeats((prev) => {
      if (occupied(prev).length < LOBBY_MIN_SEATS) {
        return prev;
      }
      return prev.map((s) =>
        s.playerId === localPlayerId ? { ...s, ready: !s.ready } : s,
      );
    });
  };

  const seated = occupied(seats);
  const seatedCount = seated.length;
  const readyCount = seated.filter((s) => s.ready).length;
  const waitingForPlayers = seatedCount < LOBBY_MIN_SEATS;
  const isFull = seatedCount >= LOBBY_MAX_SEATS;
  const localReady = seats.some(
    (s) => s.playerId === localPlayerId && s.ready,
  );
  const canToggleReady = !waitingForPlayers;
  const allReady = everyoneReady(seats);

  return {
    seats,
    seatedCount,
    readyCount,
    waitingForPlayers,
    isFull,
    localReady,
    canToggleReady,
    allReady,
    minSeats: LOBBY_MIN_SEATS,
    maxSeats: LOBBY_MAX_SEATS,
    toggleReady,
    leave,
  };
}
