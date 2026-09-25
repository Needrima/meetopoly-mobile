import type { Location } from '@/api/types';
import type { GamePlayer } from '@/api/types';
import type { BoardLayout } from '@/components/board/boardLayout';
import {
  PRESENCE_POSE_TYPE,
  type PresencePose,
} from '@/lib/presencePose';

export type BoardRemoteDraw = {
  pose: PresencePose;
  accent: string;
};

type BuildOpts = {
  layout: BoardLayout;
  locations: Location[];
  players: GamePlayer[];
  /** Live + lingered poses from board presence DC. */
  remotes: Record<string, PresencePose>;
  localUserId: string | null;
  fallbackAccent: string;
};

/**
 * Phase 8.2 — board remotes for drawing:
 * prefer live/linger presence poses; for seated players with hubId and no pose,
 * place a frozen avatar at that hub tile's center so returners still see them.
 */
export function buildBoardRemoteAvatars({
  layout,
  locations,
  players,
  remotes,
  localUserId,
  fallbackAccent,
}: BuildOpts): BoardRemoteDraw[] {
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
  const resigned = new Set<string>();
  for (const p of players) {
    if (p.pinColor) {
      colorByUser.set(p.userId, p.pinColor);
    }
    if (p.resigned) {
      resigned.add(p.userId);
    }
  }

  const byUser = new Map<string, BoardRemoteDraw>();

  for (const pose of Object.values(remotes)) {
    if (!pose?.userId || resigned.has(pose.userId)) {
      continue;
    }
    if (localUserId && pose.userId === localUserId) {
      continue;
    }
    byUser.set(pose.userId, {
      pose,
      accent: colorByUser.get(pose.userId) ?? fallbackAccent,
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
      pose: {
        type: PRESENCE_POSE_TYPE,
        userId: p.userId,
        username: p.username,
        x: (tile.x + tile.width / 2) / size,
        y: (tile.y + tile.height / 2) / size,
      },
      accent: colorByUser.get(p.userId) ?? fallbackAccent,
    });
  }

  return Array.from(byUser.values());
}
