import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
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
import { formatWorldLabel, resolveWorldImage } from '@/lib/worldDisplay';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/** Scale past cover so both axes always have pan room. */
const COVER_BLEED = 1.12;

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
  /** Parent ScrollView should disable while the user drags inside a card. */
  onDragActiveChange?: (active: boolean) => void;
};

/**
 * Square world tile: map image with Ken Burns idle drift + two-finger drag-to-pan.
 * Tap selects; one finger scrolls the list; two fingers pan the map.
 * Pan offsets live until this card unmounts (leave screen).
 */
export function WorldCard({
  world,
  selected,
  onSelect,
  onDragActiveChange,
}: WorldCardProps) {
  const label = formatWorldLabel(world.worldId);
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
    return {
      width,
      height,
      minX: box.w - width,
      maxX: 0,
      minY: box.h - height,
      maxY: 0,
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

    // Center once when geometry first becomes available; keep position on re-layout
    // only if still within bounds (e.g. rotation). Fresh mount starts centered.
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

  // Two fingers = map pan; one finger is left free for the outer ScrollView.
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

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

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
        style={styles.card}
        onLayout={onLayout}
      >
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
        {selected ? (
          <View style={styles.selectedOverlay} pointerEvents="none" />
        ) : null}
        <View style={styles.labelChip} pointerEvents="none">
          <Text style={styles.cardLabel} numberOfLines={2}>
            {label}
          </Text>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.brandMuted,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  labelChip: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    maxWidth: '90%',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(20, 32, 27, 0.55)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    zIndex: 2,
  },
  cardLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.onBrand,
    textAlign: 'right',
  },
});
