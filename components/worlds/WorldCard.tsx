import { memo, useCallback, useMemo } from 'react';
import {
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
 * Tap toggles selection. Centered multi-line region title.
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
  const onSelect = useCallback(() => {
    onToggleSelect(world.worldId);
  }, [onToggleSelect, world.worldId]);
  const { box, scaled, gesture, imageStyle, onLayout } = useWorldCardKenBurns({
    worldId: world.worldId,
    image,
    active,
    onSelect,
    onDragActiveChange,
  });

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
            active={active}
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
});
