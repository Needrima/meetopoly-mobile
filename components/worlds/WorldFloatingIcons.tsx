import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { Location } from '@/api/types';
import {
  resolveBoardIcon,
  type BoardIcon,
} from '@/components/board/iconRegistry';
import { useLocations } from '@/hooks/useLocations';
import { colors } from '@/theme/colors';

const ICON_SIZE = 34;
/** Cap for Android smoothness (Ken Burns + many SVG animations). */
const MAX_FLOATERS = 10;

type Floater = {
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

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Evenly sample up to `limit` items from a list (spread across the board). */
function sampleEvenly<T>(items: T[], limit: number): T[] {
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
function pickFloaters(worldId: string, locations: Location[]): Floater[] {
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
    // Spread around a soft ring so many icons don’t pile on the title.
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

function FloatingIcon({
  floater,
  boxW,
  boxH,
}: {
  floater: Floater;
  boxW: number;
  boxH: number;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const { Icon, nx, ny, ampX, ampY, durX, durY } = floater;

  useEffect(() => {
    tx.value = 0;
    ty.value = 0;
    tx.value = withRepeat(
      withSequence(
        withTiming(ampX, {
          duration: durX,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(-ampX, {
          duration: durX,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      true,
    );
    ty.value = withRepeat(
      withSequence(
        withTiming(-ampY, {
          duration: durY,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(ampY, {
          duration: durY,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      true,
    );
  }, [ampX, ampY, durX, durY, tx, ty]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  const left = nx * boxW - ICON_SIZE / 2;
  const top = ny * boxH - ICON_SIZE / 2;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.iconWrap, { left, top }, style]}
    >
      <Icon width={ICON_SIZE} height={ICON_SIZE} color={colors.onBrand} />
    </Animated.View>
  );
}

type WorldFloatingIconsProps = {
  worldId: string;
  width: number;
  height: number;
};

/**
 * Soft white city icons drifting behind the world title (up to 15 properties; no generics).
 */
export function WorldFloatingIcons({
  worldId,
  width,
  height,
}: WorldFloatingIconsProps) {
  const { data } = useLocations(worldId);
  const floaters = useMemo(
    () => pickFloaters(worldId, data?.locations ?? []),
    [worldId, data?.locations],
  );

  if (width <= 0 || height <= 0 || floaters.length === 0) {
    return null;
  }

  return (
    <View style={styles.layer} pointerEvents="none">
      {floaters.map((f) => (
        <FloatingIcon
          key={f.path}
          floater={f}
          boxW={width}
          boxH={height}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  iconWrap: {
    position: 'absolute',
    width: ICON_SIZE,
    height: ICON_SIZE,
    opacity: 0.38,
  },
});
