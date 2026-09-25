import type { Location } from '@/api/types';
import { colorGroups, colors } from '@/theme/colors';

const GROUP_HEX: Record<string, string> = {
  brown: colorGroups.brown,
  lightBlue: colorGroups.lightBlue,
  lightblue: colorGroups.lightBlue,
  pink: colorGroups.pink,
  orange: colorGroups.orange,
  red: colorGroups.red,
  yellow: colorGroups.yellow,
  green: colorGroups.green,
  darkBlue: colorGroups.darkBlue,
  darkblue: colorGroups.darkBlue,
  violet: colorGroups.violet,
};

export type DeedRentRow = { label: string; value: string };

/**
 * Seed names for utilities/railroads often include the world pack
 * ("Europe 3 Water Works"). Strip that for player-facing UI.
 */
export function stripWorldNamePrefix(name: string): string {
  const stripped = name
    .replace(
      /^(?:Africa|Asia(?:\s+\d+)?|Europe(?:\s+\d+)?|central-america-\d+|north-america-\d+|south-america-\d+|middle-east-\d+|oceania-\d+)\s+/i,
      '',
    )
    .trim();
  return stripped.length > 0 ? stripped : name;
}

export function stripColorFor(
  loc: Location | null | undefined,
  kind: string,
): string {
  if (loc?.kind === 'property' && loc.colorGroup) {
    return GROUP_HEX[loc.colorGroup] ?? colorGroups.brown;
  }
  if (kind === 'railroad') {
    return colors.info;
  }
  if (kind === 'utility') {
    return colors.accent;
  }
  return colors.brandMuted;
}

/** Relative luminance 0–1; light strips need dark text. */
export function isLightHex(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length < 6) {
    return false;
  }
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.65;
}

function propertyRentRows(rents: number[]): DeedRentRow[] {
  if (rents.length === 0) {
    return [];
  }
  const labels = [
    'Rent',
    '1 house',
    '2 houses',
    '3 houses',
    '4 houses',
    'Hotel',
  ];
  const rows: DeedRentRow[] = [];
  for (let i = 0; i < labels.length && i < rents.length; i++) {
    rows.push({ label: labels[i], value: String(rents[i]) });
  }
  return rows;
}

/** Kind-aware rent copy: cities use houses; airports by count owned; utils × dice. */
export function rentRowsFor(
  kind: string,
  location: Location | null | undefined,
): DeedRentRow[] {
  const rents =
    location?.rents?.filter((n): n is number => typeof n === 'number') ?? [];

  if (kind === 'railroad') {
    return rents.map((v, i) => ({
      label: i === 0 ? '1 airport' : `${i + 1} airports`,
      value: String(v),
    }));
  }

  if (kind === 'utility') {
    const m =
      location?.utilityMultiplier?.filter(
        (n): n is number => typeof n === 'number',
      ) ?? [4, 10];
    return [
      { label: '1 utility', value: `${m[0] ?? 4}× dice` },
      { label: 'Both', value: `${m[1] ?? 10}× dice` },
    ];
  }

  return propertyRentRows(rents);
}

export function kindFallbackLabel(kind: string): string {
  if (kind === 'railroad') {
    return 'Air hub';
  }
  if (kind === 'utility') {
    return 'Utility';
  }
  return 'Property';
}

export function isBuyableKind(kind: string | undefined): boolean {
  return kind === 'property' || kind === 'railroad' || kind === 'utility';
}
