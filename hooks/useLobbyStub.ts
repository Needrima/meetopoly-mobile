import { useEffect, useState } from 'react';

/** Hard table capacity (locked Phase 5). */
export const LOBBY_MAX_SEATS = 6;
/** Cannot start / Ready until at least this many seated. */
export const LOBBY_MIN_SEATS = 2;

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
 * Phase 5.2+ local lobby stub (replaced by real table WS in 5.6).
 * 5.2: seat the local player; expose waiting-until-≥2.
 * Bots / Ready come in later slices — keep API shape ready.
 */
export function useLobbyStub({
  worldId,
  localPlayerId,
  localDisplayName,
}: UseLobbyStubArgs) {
  const [seats, setSeats] = useState<LobbySeat[]>(emptySeats);

  useEffect(() => {
    setSeats(seatLocal(emptySeats(), localPlayerId, localDisplayName));

    return () => {
      setSeats(emptySeats());
    };
  }, [worldId, localPlayerId, localDisplayName]);

  const leave = () => {
    setSeats((prev) => clearLocal(prev, localPlayerId));
  };

  const seatedCount = seats.filter((s) => s.playerId != null).length;
  const waitingForPlayers = seatedCount < LOBBY_MIN_SEATS;

  return {
    seats,
    seatedCount,
    waitingForPlayers,
    minSeats: LOBBY_MIN_SEATS,
    maxSeats: LOBBY_MAX_SEATS,
    leave,
  };
}
