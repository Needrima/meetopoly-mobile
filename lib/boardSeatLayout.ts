/**
 * Phase 16.2 — Meet-style seat grid column count for 1–6 seated players.
 * 2→2, 3→3, 4→2×2, 5→2×3, 6→3×2.
 */
export function boardSeatColumns(playerCount: number): number {
  const n = Math.max(0, Math.floor(playerCount));
  if (n <= 1) {
    return 1;
  }
  if (n === 2) {
    return 2;
  }
  if (n === 3) {
    return 3;
  }
  if (n === 4 || n === 5) {
    return 2;
  }
  return 3;
}
