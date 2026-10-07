import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAppActive } from '@/hooks/useAppActive';
import {
  FLOATER_ICON_SIZE,
  useWorldFloaters,
  type WorldFloater,
} from '@/hooks/useWorldFloaters';
import { colors } from '@/theme/colors';

function FloatingIcon({
  floater,
  boxW,
  boxH,
  running,
}: {
  floater: WorldFloater;
  boxW: number;
  boxH: number;
  running: boolean;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const { Icon, nx, ny, ampX, ampY, durX, durY } = floater;

  useEffect(() => {
    if (!running) {
      cancelAnimation(tx);
      cancelAnimation(ty);
      tx.value = 0;
      ty.value = 0;
      return;
    }
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
    return () => {
      cancelAnimation(tx);
      cancelAnimation(ty);
    };
  }, [running, ampX, ampY, durX, durY, tx, ty]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  const left = nx * boxW - FLOATER_ICON_SIZE / 2;
  const top = ny * boxH - FLOATER_ICON_SIZE / 2;

  return (
    <Animated.View
      pointerEvents="none"
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      style={[styles.iconWrap, { left, top }, style]}
    >
      <Icon
        width={FLOATER_ICON_SIZE}
        height={FLOATER_ICON_SIZE}
        color={colors.onBrand}
      />
    </Animated.View>
  );
}

type WorldFloatingIconsProps = {
  worldId: string;
  width: number;
  height: number;
  /** Focused carousel page — offscreen unmounts floaters. */
  active: boolean;
};

/**
 * Soft white city icons drifting behind the world title (property icons only).
 */
export function WorldFloatingIcons({
  worldId,
  width,
  height,
  active,
}: WorldFloatingIconsProps) {
  const appActive = useAppActive();
  const { floaters, ready } = useWorldFloaters(worldId);

  if (!active || width <= 0 || height <= 0 || !ready) {
    return null;
  }

  const running = appActive;

  return (
    <View style={styles.layer} pointerEvents="none">
      {floaters.map((f) => (
        <FloatingIcon
          key={f.path}
          floater={f}
          boxW={width}
          boxH={height}
          running={running}
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
    width: FLOATER_ICON_SIZE,
    height: FLOATER_ICON_SIZE,
    opacity: 0.38,
  },
});
