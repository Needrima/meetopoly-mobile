import { useEffect, useState } from 'react';

import type { Game } from '@/api/types';

/** Format ms as `m:ss` or `h:mm:ss` when ≥ 60 minutes. */
export function formatBankMs(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Per-player time (Phase 6.3b) for HUD on every device.
 * Current player's bank ticks down; others stay paused at their remainder.
 */
export function usePlayerTimeBanks(
  game: Game | null | undefined,
): Record<string, string> {
  const [labels, setLabels] = useState<Record<string, string>>({});

  const playersKey =
    game?.players
      ?.map((p) => `${p.userId}:${p.timeRemainingMs}:${p.resigned ? 1 : 0}`)
      .join('|') ?? '';
  const turnKey = `${game?.status ?? ''}:${game?.currentUserId ?? ''}:${game?.turnStartedAt ?? ''}`;

  useEffect(() => {
    if (!game || game.status !== 'active' || !game.players?.length) {
      setLabels({});
      return;
    }

    const endsAt = new Map<string, number>();
    const frozen = new Map<string, number>();
    const received = Date.now();

    for (const p of game.players) {
      if (p.resigned) {
        frozen.set(p.userId, 0);
        continue;
      }
      const ms = p.timeRemainingMs ?? 0;
      if (p.userId === game.currentUserId && game.turnStartedAt) {
        // Server `timeRemainingMs` is already live at snapshot time.
        endsAt.set(p.userId, received + ms);
      } else {
        frozen.set(p.userId, ms);
      }
    }

    const tick = () => {
      const now = Date.now();
      const next: Record<string, string> = {};
      for (const p of game.players) {
        if (frozen.has(p.userId)) {
          next[p.userId] = formatBankMs(frozen.get(p.userId) ?? 0);
          continue;
        }
        const end = endsAt.get(p.userId) ?? now;
        next[p.userId] = formatBankMs(end - now);
      }
      setLabels(next);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [game, playersKey, turnKey]);

  return labels;
}
