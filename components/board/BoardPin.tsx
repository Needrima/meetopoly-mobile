import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { PIN_JUMP_MS } from '@/hooks/useGamePinMotion';

type BoardPinProps = {
  x: number;
  y: number;
  radius: number;
  accent: string;
  /** When true, interpolate to new tile center (~one hop). */
  animate?: boolean;
};

const HOP_MS = 300;
/** Pixel travel above this uses the longer jail-teleport ease. */
const JUMP_DIST = 72;

/**
 * Game pin on a boardIndex slot. Position via Reanimated when hopping tiles.
 * Long moves (Go-to-Jail → Jail) use a slower straight-line lerp.
 */
export function BoardPin({
  x,
  y,
  radius,
  accent,
  animate = true,
}: BoardPinProps) {
  const head = radius * 1.35;
  const stemH = radius * 1.1;
  const stemW = Math.max(3, radius * 0.28);
  const left = useSharedValue(x - head / 2);
  const top = useSharedValue(y - head - stemH * 0.35);
  const prevXY = useRef({ x, y });

  useEffect(() => {
    const nextLeft = x - head / 2;
    const nextTop = y - head - stemH * 0.35;
    if (!animate) {
      left.value = nextLeft;
      top.value = nextTop;
      prevXY.current = { x, y };
      return;
    }
    const dist = Math.hypot(x - prevXY.current.x, y - prevXY.current.y);
    prevXY.current = { x, y };
    const duration = dist > JUMP_DIST ? PIN_JUMP_MS : HOP_MS;
    left.value = withTiming(nextLeft, {
      duration,
      easing: Easing.inOut(Easing.cubic),
    });
    top.value = withTiming(nextTop, {
      duration,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [x, y, head, stemH, animate, left, top]);

  const animStyle = useAnimatedStyle(() => ({
    left: left.value,
    top: top.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.root,
        {
          width: head,
          height: head + stemH,
        },
        animStyle,
      ]}
      accessibilityLabel="Game pin"
    >
      <View
        style={[
          styles.head,
          {
            width: head,
            height: head,
            borderRadius: head / 2,
            backgroundColor: accent,
          },
        ]}
      >
        <View style={styles.headDot} />
      </View>
      <View
        style={[
          styles.stem,
          {
            width: stemW,
            height: stemH,
            backgroundColor: accent,
            marginTop: -2,
          },
        ]}
      />
      <View
        style={[
          styles.base,
          {
            width: radius * 1.2,
            height: radius * 0.35,
            borderRadius: radius,
            backgroundColor: accent,
            opacity: 0.45,
            marginTop: -2,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    zIndex: 15,
    alignItems: 'center',
  },
  head: {
    borderWidth: 2,
    borderColor: 'rgba(20, 32, 27, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headDot: {
    width: '38%',
    height: '38%',
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  stem: {
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  base: {},
});
