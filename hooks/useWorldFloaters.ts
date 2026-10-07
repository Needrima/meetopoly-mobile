import { useMemo } from 'react';

import type { Location } from '@/api/types';
import {
  resolveBoardIcon,
  type BoardIcon,
} from '@/components/board/iconRegistry';
import { useLocations } from '@/hooks/useLocations';

/** Cap for smoothness (Ken Burns + many SVG animations). */
export const MAX_FLOATERS = 10;
export const FLOATER_ICON_SIZE = 34;

export type WorldFloater = {
  path: string;
  Icon: BoardIcon;
  /** Normalized 0–1 start position. */
  nx: number;
  ny: number;
  ampX: number;
  ampY: number;
  durX: number;
  durY: number;
};

const floaterCache = new Map<string, WorldFloater[]>();

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Evenly sample up to `limit` items from a list (spread across the board). */
export function sampleEvenly<T>(items: T[], limit: number): T[] {
  if (items.length <= limit) {
    return items;
  }
  if (limit <= 1) {
    return items.slice(0, 1);
  }
  const out: T[] = [];
  for (let i = 0; i < limit; i += 1) {
    const idx = Math.round((i * (items.length - 1)) / (limit - 1));
    out.push(items[idx]!);
  }
  return out;
}

/** City landmark icons only — skip generic board markers (GO, Chance, jail, …). */
export function pickFloaters(
  worldId: string,
  locations: Location[],
): WorldFloater[] {
  const seen = new Set<string>();
  const candidates: { path: string; Icon: BoardIcon }[] = [];

  for (const loc of locations) {
    if (loc.kind !== 'property') {
      continue;
    }
    const path = loc.assets?.icon?.trim();
    if (!path || seen.has(path) || path.includes('/generic/')) {
      continue;
    }
    const Icon = resolveBoardIcon(path);
    if (!Icon) {
      continue;
    }
    seen.add(path);
    candidates.push({ path, Icon });
  }

  const picked = sampleEvenly(candidates, MAX_FLOATERS);
  const n = Math.max(picked.length, 1);
  return picked.map((c, i) => {
    const seed = hashSeed(`${worldId}:${c.path}:${i}`);
    const angle = (i / n) * Math.PI * 2 + ((seed % 17) / 17) * 0.35;
    const radius = 0.28 + ((seed % 40) / 40) * 0.22;
    return {
      ...c,
      nx: 0.5 + Math.cos(angle) * radius,
      ny: 0.5 + Math.sin(angle) * radius * 0.85,
      ampX: 10 + (seed % 18),
      ampY: 8 + ((seed >> 4) % 16),
      durX: 5200 + (seed % 7) * 900,
      durY: 6100 + ((seed >> 3) % 6) * 850,
    };
  });
}

/**
 * Resolved floating city icons for a world (cached after first successful pick).
 */
export function useWorldFloaters(worldId: string) {
  const { data, isSuccess } = useLocations(worldId);
  const locations = data?.locations;

  const floaters = useMemo(() => {
    const id = worldId.trim();
    if (!id || !locations?.length) {
      return [];
    }
    const cached = floaterCache.get(id);
    if (cached) {
      return cached;
    }
    if (!isSuccess) {
      return [];
    }
    const next = pickFloaters(id, locations);
    if (next.length > 0) {
      floaterCache.set(id, next);
    }
    return next;
  }, [worldId, locations, isSuccess]);

  return {
    floaters,
    ready: floaters.length > 0,
  };
}
