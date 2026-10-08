type RosterEntry = {
  userId: string;
  username: string;
  avatarUrl?: string;
};

/** Fields that affect hub remote draw list (Phase 23.4). */
export function presenceRosterSig(
  roster: readonly RosterEntry[],
): string {
  if (roster.length === 0) {
    return '';
  }
  const parts: string[] = [];
  for (const r of roster) {
    const url =
      typeof r.avatarUrl === 'string' ? r.avatarUrl.trim() : '';
    parts.push(`${r.userId}\t${r.username ?? ''}\t${url}`);
  }
  parts.sort();
  return parts.join('\n');
}
