import { useEffect, useState } from "react";

import type { Game } from "@/api/types";

/** Format ms as `m:ss` or `h:mm:ss` when ≥ 60 minutes. */
export function formatBankMs(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Phase 13.2 — panel turns red at ≤1 minute remaining. */
export const TURN_CLOCK_URGENT_MS = 60_000;

export type TurnClockHud = {
  userId: string;
  label: string;
  /** True when remaining ≤ 1:00 (red). */
  urgent: boolean;
  remainingMs: number;
};

/**
 * Phase 13.2 — live turn clock for the **current** player only (3:00 fresh per turn).
 * Paused when `turnStartedAt` is empty (auction / trade reply wait).
 */
export function useCurrentTurnClock(
  game: Game | null | undefined,
): TurnClockHud | null {
  const [hud, setHud] = useState<TurnClockHud | null>(null);

  const currentId = game?.currentUserId ?? "";
  const current = game?.players?.find((p) => p.userId === currentId);
  const playersKey = current
    ? `${current.userId}:${current.timeRemainingMs}:${current.resigned ? 1 : 0}`
    : "";
  const turnKey = `${game?.status ?? ""}:${currentId}:${game?.turnStartedAt ?? ""}`;

  useEffect(() => {
    if (!game || game.status !== "active" || !current || current.resigned) {
      setHud(null);
      return;
    }

    const received = Date.now();
    const ms = current.timeRemainingMs ?? 0;
    const ticking = Boolean(game.turnStartedAt);
    const endAt = ticking ? received + ms : null;

    const tick = () => {
      const remaining = endAt != null ? Math.max(0, endAt - Date.now()) : ms;
      setHud({
        userId: current.userId,
        label: formatBankMs(remaining),
        urgent: remaining <= TURN_CLOCK_URGENT_MS,
        remainingMs: remaining,
      });
    };
    tick();
    if (!ticking) {
      return;
    }
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [game, playersKey, turnKey, current]);

  return hud;
}

/**
 * @deprecated Prefer `useCurrentTurnClock` (Phase 13.2 shows current player only).
 * Kept for hub sheets that still key by userId.
 */
export function usePlayerTimeBanks(
  game: Game | null | undefined,
): Record<string, string> {
  const clock = useCurrentTurnClock(game);
  if (!clock) {
    return {};
  }
  return { [clock.userId]: clock.label };
}
