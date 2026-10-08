import type { GamePlayer } from '@/api/types';
import { accentAgainstFloor } from '@/lib/hubFloorContrast';

type HubRosterEntry = {
  userId: string;
  username: string;
  avatarUrl?: string;
};

export type HubRemoteMeta = {
  userId: string;
  username: string;
  accent: string;
  imageUrl?: string | null;
};

type BuildOpts = {
  remotePeerIds: readonly string[];
  roster: readonly HubRosterEntry[];
  players: GamePlayer[];
  localUserId: string | null;
  floorColor: string;
  fallbackAccent: string;
};

/**
 * Phase 23.2 — hub draw list (metadata only; poses in registry).
 */
export function buildHubRemoteMetas({
  remotePeerIds,
  roster,
  players,
  localUserId,
  floorColor,
  fallbackAccent,
}: BuildOpts): HubRemoteMeta[] {
  const colorByUser = new Map<string, string>();
  const avatarByUser = new Map<string, string>();
  for (const p of players) {
    if (p.pinColor) {
      colorByUser.set(p.userId, p.pinColor);
    }
    const url = typeof p.avatarUrl === 'string' ? p.avatarUrl.trim() : '';
    if (url) {
      avatarByUser.set(p.userId, url);
    }
  }
  const usernameByUser = new Map<string, string>();
  for (const entry of roster) {
    if (!entry.userId) {
      continue;
    }
    if (entry.username) {
      usernameByUser.set(entry.userId, entry.username);
    }
    const url =
      typeof entry.avatarUrl === 'string' ? entry.avatarUrl.trim() : '';
    if (url && !avatarByUser.has(entry.userId)) {
      avatarByUser.set(entry.userId, url);
    }
  }

  const out: HubRemoteMeta[] = [];
  for (const userId of remotePeerIds) {
    if (!userId || (localUserId && userId === localUserId)) {
      continue;
    }
    const preferred = colorByUser.get(userId) ?? fallbackAccent;
    out.push({
      userId,
      username: usernameByUser.get(userId) ?? 'Player',
      accent: accentAgainstFloor(preferred, floorColor, userId),
      imageUrl: avatarByUser.get(userId) ?? null,
    });
  }
  return out;
}
