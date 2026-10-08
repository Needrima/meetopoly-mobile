import type { GamePlayer } from '@/api/types';

/** Fields that affect board/hub presence avatar draw lists (Phase 23.4). */
export function presencePlayerSig(players: readonly GamePlayer[]): string {
  if (players.length === 0) {
    return '';
  }
  const parts: string[] = [];
  for (const p of players) {
    const hub = p.hubId?.trim() ?? '';
    const url = typeof p.avatarUrl === 'string' ? p.avatarUrl.trim() : '';
    parts.push(
      `${p.userId}\t${p.resigned ? 1 : 0}\t${hub}\t${p.pinColor ?? ''}\t${url}\t${p.username ?? ''}`,
    );
  }
  parts.sort();
  return parts.join('\n');
}
