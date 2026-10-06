import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { WorldSummary } from '@/api/types';
import { WorldFloatingIcons } from '@/components/worlds/WorldFloatingIcons';
import { formatWorldLabel, formatWorldLabelLines, resolveWorldImage } from '@/lib/worldDisplay';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/** Scale past cover so both axes always have pan room (avoids edge gaps). */
const COVER_BLEED = 1.22;
/** Keep a few px of image past every edge during Ken Burns / pan. */
const EDGE_INSET = 4;
/** Dark fill so any subpixel gap never flashes cream. */
const MAP_VOID = '#14201B';

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function resolveIntrinsicSize(source: ImageSourcePropType): {
  width: number;
  height: number;
} | null {
  const resolved = Image.resolveAssetSource(source);
  if (
    !resolved ||
    typeof resolved.width !== 'number' ||
    typeof resolved.height !== 'number' ||
    resolved.width <= 0 ||
    resolved.height <= 0
  ) {
    return null;
  }
  return { width: resolved.width, height: resolved.height };
}

export type WorldCardProps = {
  world: WorldSummary;
  selected: boolean;
  onSelect: () => void;
  /** Parent carousel should disable while the user two-finger pans. */
  onDragActiveChange?: (active: boolean) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * World carousel slide: Ken Burns idle + two-finger pan; one finger left for paging.
 * Tap toggles selection. Centered multi-line region title.
 */
export function WorldCard({
  world,
  selected,
  onSelect,
  onDragActiveChange,
  style,
}: WorldCardProps) {
  const label = formatWorldLabel(world.worldId);
  const labelLines = useMemo(
    () => formatWorldLabelLines(world.worldId),
    [world.worldId],
  );
  const image = resolveWorldImage(world.worldId);
  const intrinsic = useMemo(
    () => (image ? resolveIntrinsicSize(image) : null),
    [image],
  );
  const seed = useMemo(() => hashSeed(world.worldId), [world.worldId]);

  const [box, setBox] = useState({ w: 0, h: 0 });

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const minX = useSharedValue(0);
  const maxX = useSharedValue(0);
  const minY = useSharedValue(0);
  const maxY = useSharedValue(0);
  const dragOriginX = useSharedValue(0);
  const dragOriginY = useSharedValue(0);
  const dragging = useSharedValue(0);
  const ready = useSharedValue(0);
  const durX = useSharedValue(10000);
  const durY = useSharedValue(12000);

  const scaled = useMemo(() => {
    if (!intrinsic || box.w <= 0 || box.h <= 0) {
      return null;
    }
    const scale =
      Math.max(box.w / intrinsic.width, box.h / intrinsic.height) * COVER_BLEED;
    const width = intrinsic.width * scale;
    const height = intrinsic.height * scale;
    // Strict cover range, then pull inward so drift never exposes the void.
    const rawMinX = box.w - width;
    const rawMinY = box.h - height;
    const insetX = Math.min(EDGE_INSET, Math.max(0, (width - box.w) / 2));
    const insetY = Math.min(EDGE_INSET, Math.max(0, (height - box.h) / 2));
    return {
      width,
      height,
      minX: rawMinX + insetX,
      maxX: -insetX,
      minY: rawMinY + insetY,
      maxY: -insetY,
    };
  }, [intrinsic, box.w, box.h]);

  useEffect(() => {
    if (!scaled) {
      ready.value = 0;
      return;
    }
    minX.value = scaled.minX;
    maxX.value = scaled.maxX;
    minY.value = scaled.minY;
    maxY.value = scaled.maxY;
    durX.value = 9000 + (seed % 5) * 1100;
    durY.value = 11000 + (seed % 7) * 900;

    const cx = (scaled.minX + scaled.maxX) / 2;
    const cy = (scaled.minY + scaled.maxY) / 2;
    if (ready.value === 0) {
      tx.value = cx;
      ty.value = cy;
    } else {
      tx.value = Math.min(scaled.maxX, Math.max(scaled.minX, tx.value));
      ty.value = Math.min(scaled.maxY, Math.max(scaled.minY, ty.value));
    }
    ready.value = 1;

    cancelAnimation(tx);
    cancelAnimation(ty);
    tx.value = withRepeat(
      withSequence(
        withTiming(maxX.value, {
          duration: durX.value,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(minX.value, {
          duration: durX.value,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      false,
    );
    ty.value = withRepeat(
      withSequence(
        withTiming(minY.value, {
          duration: durY.value,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(maxY.value, {
          duration: durY.value,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(tx);
      cancelAnimation(ty);
    };
  }, [
    scaled,
    seed,
    tx,
    ty,
    minX,
    maxX,
    minY,
    maxY,
    ready,
    durX,
    durY,
  ]);

  const setDragActive = (active: boolean) => {
    onDragActiveChange?.(active);
  };

  const resumeDrift = () => {
    cancelAnimation(tx);
    cancelAnimation(ty);
    tx.value = withRepeat(
      withSequence(
        withTiming(maxX.value, {
          duration: durX.value,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(minX.value, {
          duration: durX.value,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      false,
    );
    ty.value = withRepeat(
      withSequence(
        withTiming(minY.value, {
          duration: durY.value,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(maxY.value, {
          duration: durY.value,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      false,
    );
  };

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(onSelect)();
    });

  // Two fingers = map pan; one finger stays free for the carousel FlatList.
  const pan = Gesture.Pan()
    .minPointers(2)
    .maxPointers(2)
    .onStart(() => {
      dragOriginX.value = tx.value;
      dragOriginY.value = ty.value;
      cancelAnimation(tx);
      cancelAnimation(ty);
      dragging.value = 1;
      runOnJS(setDragActive)(true);
    })
    .onUpdate((e) => {
      const nextX = dragOriginX.value + e.translationX;
      const nextY = dragOriginY.value + e.translationY;
      tx.value = Math.min(maxX.value, Math.max(minX.value, nextX));
      ty.value = Math.min(maxY.value, Math.max(minY.value, nextY));
    })
    .onFinalize(() => {
      if (dragging.value === 0) {
        return;
      }
      dragging.value = 0;
      runOnJS(setDragActive)(false);
      runOnJS(resumeDrift)();
    });

  const gesture = Gesture.Simultaneous(pan, tap);

  const imageStyle = useAnimatedStyle(() => {
    const x = Math.min(maxX.value, Math.max(minX.value, tx.value));
    const y = Math.min(maxY.value, Math.max(minY.value, ty.value));
    return {
      transform: [{ translateX: x }, { translateY: y }],
    };
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width <= 0 || height <= 0) {
      return;
    }
    setBox((prev) =>
      prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  };

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        style={[styles.card, selected ? styles.cardSelected : null, style]}
      >
        <View style={styles.clip} onLayout={onLayout}>
          {image && scaled ? (
            <Animated.Image
              source={image}
              style={[
                styles.cardImage,
                { width: scaled.width, height: scaled.height },
                imageStyle,
              ]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.cardImageFill, styles.cardFallback]} />
          )}
          <WorldFloatingIcons
            worldId={world.worldId}
            width={box.w}
            height={box.h}
          />
          <View style={styles.labelWrap} pointerEvents="none">
            {labelLines.map((line) => (
              <Text key={line} style={styles.cardLabel}>
                {line}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: MAP_VOID,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSelected: {
    borderWidth: 3,
    borderColor: colors.brand,
  },
  clip: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 13,
    backgroundColor: MAP_VOID,
  },
  cardImage: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  cardImageFill: {
    ...StyleSheet.absoluteFill,
  },
  cardFallback: {
    backgroundColor: MAP_VOID,
  },
  labelWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 2,
  },
  cardLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 42,
    lineHeight: 48,
    color: colors.onBrand,
    textAlign: 'center',
    textShadowColor: 'rgba(20, 32, 27, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
});
