import type { Location } from '@/api/types';
import type { BoardSide } from '@/components/board/boardLayout';

/** Short label for cramped board tiles. */
export function shortTileName(loc: Location | undefined): string {
  if (!loc) {
    return '';
  }
  if (loc.kind === 'special') {
    switch (loc.specialType) {
      case 'go':
        return 'GO';
      case 'jail':
        return 'Jail';
      case 'free_parking':
        return 'Parking';
      case 'go_to_jail':
        return 'Jail';
      case 'chance':
        return 'Chance';
      case 'community_chest':
        return 'Chest';
      case 'tax':
        return loc.slug.includes('luxury') ? 'Lux tax' : 'Tax';
      default:
        break;
    }
  }
  if (loc.kind === 'railroad') {
    return 'Air';
  }
  if (loc.kind === 'utility') {
    return loc.slug.includes('water') ? 'Water' : 'Power';
  }
  // First word, trim long names
  const first = loc.name.split(/[\s—–-]/)[0]?.trim() || loc.name;
  return first.length > 9 ? `${first.slice(0, 8)}…` : first;
}

/** Rotate content so labels face the center of the board. */
export function contentRotation(side: BoardSide): string {
  switch (side) {
    case 'bottom':
      return '0deg';
    case 'left':
      return '90deg';
    case 'top':
      return '180deg';
    case 'right':
      return '-90deg';
  }
}
