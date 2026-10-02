import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

import { TURN_CLOCK_URGENT_MS } from '@/hooks/useTurnCountdown';
import { colors } from '@/theme/colors';

/** Matches backend TurnClockDuration (3 minutes). */
export const TURN_CLOCK_DURATION_MS = 180_000;

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const RING_STROKE = 3;

type SeatTurnClockRingProps = {
  active: boolean;
  /** When false (auction/trade/debt-pay), freeze the ring. */
  ticking: boolean;
  remainingMs: number;
  pinColor: string;
  borderRadius: number;
};

/**
 * Phase 16.3 — depleting seat border: pin color, switches to danger at ≤1:00.
 * Shrinks from top-left clockwise via Reanimated strokeDashoffset.
 */
export function SeatTurnClockRing({
  active,
  ticking,
  remainingMs,
  pinColor,
  borderRadius,
}: SeatTurnClockRingProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const progress = useSharedValue(1);

  const geom = useMemo(() => {
    const { w, h } = size;
    if (w < 8 || h < 8) {
      return null;
    }
    const inset = RING_STROKE / 2;
    const rw = Math.max(0, w - RING_STROKE);
    const rh = Math.max(0, h - RING_STROKE);
    const radius = Math.max(0, borderRadius - inset);
    const peri = 2 * (rw + rh - 2 * radius) + 2 * Math.PI * radius;
    return { x: inset, y: inset, rw, rh, radius, peri };
  }, [size, borderRadius]);

  useEffect(() => {
    if (!active || !geom) {
      cancelAnimation(progress);
      return;
    }
    const target = Math.max(
      0,
      Math.min(1, remainingMs / TURN_CLOCK_DURATION_MS),
    );
    cancelAnimation(progress);
    progress.value = target;
    if (ticking && remainingMs > 16) {
      progress.value = withTiming(0, {
        duration: remainingMs,
        easing: Easing.linear,
      });
    }
  }, [active, ticking, remainingMs, geom, progress]);

  const animatedProps = useAnimatedProps(() => {
    const peri = geom?.peri ?? 1;
    const p = Math.max(0, Math.min(1, progress.value));
    return {
      strokeDashoffset: (1 - p) * peri,
    };
  }, [geom?.peri]);

  if (!active) {
    return null;
  }

  const ringColor =
    remainingMs <= TURN_CLOCK_URGENT_MS ? colors.danger : pinColor;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) {
      setSize({ w: width, h: height });
    }
  };

  return (
    <View style={styles.host} pointerEvents="none" onLayout={onLayout}>
      {geom && size.w > 0 ? (
        <Svg width={size.w} height={size.h}>
          <Rect
            x={geom.x}
            y={geom.y}
            width={geom.rw}
            height={geom.rh}
            rx={geom.radius}
            ry={geom.radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={RING_STROKE}
            strokeOpacity={0.3}
          />
          <AnimatedRect
            x={geom.x}
            y={geom.y}
            width={geom.rw}
            height={geom.rh}
            rx={geom.radius}
            ry={geom.radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={RING_STROKE}
            strokeDasharray={`${geom.peri} ${geom.peri}`}
            animatedProps={animatedProps}
            strokeLinecap="butt"
          />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFill,
    zIndex: 6,
  },
});
