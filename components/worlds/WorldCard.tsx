import { memo, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import type { WorldSummary } from '@/api/types';
import { WorldFloatingIcons } from '@/components/worlds/WorldFloatingIcons';
import { useWorldCardKenBurns } from '@/hooks/useWorldCardKenBurns';
import { useWorldCardSceneReady } from '@/hooks/useWorldCardSceneReady';
import { useWorldFloaters } from '@/hooks/useWorldFloaters';
import {
  formatWorldLabel,
  formatWorldLabelLines,
  resolveWorldImage,
} from '@/lib/worldDisplay';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/** Dark fill so any subpixel gap never flashes cream. */
const MAP_VOID = '#14201B';

export type WorldCardProps = {
  world: WorldSummary;
  selected: boolean;
  /** Focused carousel page — drives Ken Burns + floaters. */
  active: boolean;
  /** Stable parent callback — tap toggles this world's selection. */
  onToggleSelect: (worldId: string) => void;
  /** Parent carousel should disable while the user two-finger pans. */
  onDragActiveChange?: (active: boolean) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * World carousel slide: Ken Burns idle + two-finger pan; one finger left for paging.
 * Focused card: static map + spinner until locations settle and SVG icons mount,
 * then Ken Burns + floater motion start together (prefetch kept for fast data).
 */
function WorldCardInner({
  world,
  selected,
  active,
  onToggleSelect,
  onDragActiveChange,
  style,
}: WorldCardProps) {
  const label = formatWorldLabel(world.worldId);
  const labelLines = useMemo(
    () => formatWorldLabelLines(world.worldId),
    [world.worldId],
  );
  const image = resolveWorldImage(world.worldId);
  const { floaters, contentReady } = useWorldFloaters(world.worldId);
  const sceneReady = useWorldCardSceneReady(
    active,
    contentReady,
    world.worldId,
  );
  const onSelect = useCallback(() => {
    onToggleSelect(world.worldId);
  }, [onToggleSelect, world.worldId]);
  const { box, scaled, gesture, imageStyle, onLayout } = useWorldCardKenBurns({
    worldId: world.worldId,
    image,
    active,
    contentReady: sceneReady,
    onSelect,
    onDragActiveChange,
  });

  const showLoader = active && !sceneReady;
  const mountFloaters = active && contentReady;

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
            floaters={floaters}
            width={box.w}
            height={box.h}
            active={mountFloaters}
            motionActive={sceneReady}
          />
          <View style={styles.labelWrap} pointerEvents="none">
            {labelLines.map((line) => (
              <Text key={line} style={styles.cardLabel}>
                {line}
              </Text>
            ))}
          </View>
          {showLoader ? (
            <View style={styles.loaderWrap} pointerEvents="none">
              <ActivityIndicator color={colors.onBrand} size="large" />
            </View>
          ) : null}
        </View>
      </View>
    </GestureDetector>
  );
}

export const WorldCard = memo(WorldCardInner);

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
  loaderWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    backgroundColor: 'rgba(20, 32, 27, 0.28)',
  },
});
