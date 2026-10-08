import type { GamePlayer, Location } from '@/api/types';
import type { BoardLayout } from '@/components/board/boardLayout';

export type BoardRemoteMeta = {
  userId: string;
  username: string;
  accent: string;
  imageUrl?: string | null;
  /** Hub-tile frozen placement (Phase 8.2); registry updated on mount. */
  frozenNorm?: { x: number; y: number };
};

type BuildOpts = {
  layout: BoardLayout;
  locations: Location[];
  players: GamePlayer[];
  /** DC / linger peer ids from presence registry (Phase 23.1). */
  remotePeerIds: readonly string[];
  localUserId: string | null;
  fallbackAccent: string;
};

/**
 * Phase 23.1 — who to draw on the board (metadata only; poses live in registry).
 * Same rules as legacy buildBoardRemoteAvatars: hubId wins over linger; synthetic hub tile.
 */
export function buildBoardRemoteMetas({
  layout,
  locations,
  players,
  remotePeerIds,
  localUserId,
  fallbackAccent,
}: BuildOpts): BoardRemoteMeta[] {
  const size = layout.size;
  if (size <= 0) {
    return [];
  }

  const locByHubId = new Map<string, Location>();
  for (const loc of locations) {
    const id = loc.hubId?.trim();
    if (id) {
      locByHubId.set(id, loc);
    }
  }
  const tileByIndex = new Map(
    layout.tiles.map((t) => [t.boardIndex, t] as const),
  );

  const colorByUser = new Map<string, string>();
  const avatarByUser = new Map<string, string>();
  const usernameByUser = new Map<string, string>();
  const resigned = new Set<string>();
  const inHub = new Set<string>();
  for (const p of players) {
    if (p.username) {
      usernameByUser.set(p.userId, p.username);
    }
    if (p.pinColor) {
      colorByUser.set(p.userId, p.pinColor);
    }
    const url = typeof p.avatarUrl === 'string' ? p.avatarUrl.trim() : '';
    if (url) {
      avatarByUser.set(p.userId, url);
    }
    if (p.resigned) {
      resigned.add(p.userId);
    }
    if (p.hubId?.trim()) {
      inHub.add(p.userId);
    }
  }

  const byUser = new Map<string, BoardRemoteMeta>();

  for (const userId of remotePeerIds) {
    if (!userId || resigned.has(userId)) {
      continue;
    }
    if (localUserId && userId === localUserId) {
      continue;
    }
    if (inHub.has(userId)) {
      continue;
    }
    byUser.set(userId, {
      userId,
      username: usernameByUser.get(userId) ?? 'Player',
      accent: colorByUser.get(userId) ?? fallbackAccent,
      imageUrl: avatarByUser.get(userId) ?? null,
    });
  }

  for (const p of players) {
    if (p.resigned || (localUserId && p.userId === localUserId)) {
      continue;
    }
    const hubId = p.hubId?.trim();
    if (!hubId || byUser.has(p.userId)) {
      continue;
    }
    const loc = locByHubId.get(hubId);
    if (!loc) {
      continue;
    }
    const tile = tileByIndex.get(loc.boardIndex);
    if (!tile) {
      continue;
    }
    byUser.set(p.userId, {
      userId: p.userId,
      username: p.username ?? 'Player',
      accent: colorByUser.get(p.userId) ?? fallbackAccent,
      imageUrl: avatarByUser.get(p.userId) ?? null,
      frozenNorm: {
        x: (tile.x + tile.width / 2) / size,
        y: (tile.y + tile.height / 2) / size,
      },
    });
  }

  return Array.from(byUser.values());
}
