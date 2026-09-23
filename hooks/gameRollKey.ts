import type { GameLastRoll } from '@/api/types';

/** Stable identity for a server lastRoll — dice + pin motion share this. */
export function gameRollKey(roll: GameLastRoll): string {
  return `${roll.userId}:${roll.fromIndex}:${roll.toIndex}:${roll.die1}:${roll.die2}:${roll.total}`;
}
