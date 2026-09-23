import { useEffect, useRef, useState } from 'react';

/** Hard table capacity (locked Phase 5). */
export const LOBBY_MAX_SEATS = 6;
/** Cannot start / Ready until at least this many seated. */
export const LOBBY_MIN_SEATS = 2;

/** Delay between fake joiners (ms) — slow enough to read the lobby fill. */
const BOT_JOIN_MS = 3200;

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

/**
 * Phase 5.2+ local lobby stub (replaced by real table WS in 5.6).
 * 5.2: seat local · 5.3: slow fake joiners to 6 · Ready in 5.4.
 */
export function useLobbyStub({
  worldId,
  localPlayerId,
  localDisplayName,
}: UseLobbyStubArgs) {
  const [seats, setSeats] = useState<LobbySeat[]>(emptySeats);
  const botOrdinalRef = useRef(0);

  useEffect(() => {
    botOrdinalRef.current = 0;
    setSeats(seatLocal(emptySeats(), localPlayerId, localDisplayName));

    const timer = setInterval(() => {
      setSeats((prev) => {
        const filled = prev.filter((s) => s.playerId != null).length;
        if (filled >= LOBBY_MAX_SEATS) {
          return prev;
        }
        botOrdinalRef.current += 1;
        return seatBotJoiner(prev, botOrdinalRef.current);
      });
    }, BOT_JOIN_MS);

    return () => {
      clearInterval(timer);
      setSeats(emptySeats());
    };
  }, [worldId, localPlayerId, localDisplayName]);

  const leave = () => {
    setSeats((prev) => clearLocal(prev, localPlayerId));
  };

  const seatedCount = seats.filter((s) => s.playerId != null).length;
  const waitingForPlayers = seatedCount < LOBBY_MIN_SEATS;
  const isFull = seatedCount >= LOBBY_MAX_SEATS;

  return {
    seats,
    seatedCount,
    waitingForPlayers,
    isFull,
    minSeats: LOBBY_MIN_SEATS,
    maxSeats: LOBBY_MAX_SEATS,
    leave,
  };
}
