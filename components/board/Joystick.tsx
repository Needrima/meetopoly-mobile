import { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';

import type { StickInput } from '@/hooks/useBoardWalk';
import { colors } from '@/theme/colors';

type JoystickProps = {
  onStick: (stick: StickInput) => void;
  size?: number;
  /** Knob fill — typically the local avatar accent. */
  accent?: string;
};

/**
 * Phase 4.5 — PanResponder virtual stick for the panel bottom-right dock.
 * Emits normalized {-1..1} board-local directions (y+ = down / south).
 */
export function Joystick({
  onStick,
  size = 96,
  accent = colors.accent,
}: JoystickProps) {
  const travel = size * 0.32;
  const knobSize = size * 0.38;
  const onStickRef = useRef(onStick);
  onStickRef.current = onStick;
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (_e: GestureResponderEvent) => {
          setOffset({ x: 0, y: 0 });
          onStickRef.current({ x: 0, y: 0 });
        },
        onPanResponderMove: (
          _e: GestureResponderEvent,
          g: PanResponderGestureState,
        ) => {
          const dx = g.dx;
          const dy = g.dy;
          const mag = Math.hypot(dx, dy);
          const clamped = mag > travel ? travel : mag;
          const ox = mag > 0.001 ? (dx / mag) * clamped : 0;
          const oy = mag > 0.001 ? (dy / mag) * clamped : 0;
          setOffset({ x: ox, y: oy });
          onStickRef.current({
            x: travel > 0 ? ox / travel : 0,
            y: travel > 0 ? oy / travel : 0,
          });
        },
        onPanResponderRelease: () => {
          setOffset({ x: 0, y: 0 });
          onStickRef.current({ x: 0, y: 0 });
        },
        onPanResponderTerminate: () => {
          setOffset({ x: 0, y: 0 });
          onStickRef.current({ x: 0, y: 0 });
        },
      }),
    [travel],
  );

  return (
    <View
      style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityLabel="Movement joystick"
      accessibilityRole="adjustable"
      {...pan.panHandlers}
    >
      <View
        pointerEvents="none"
        style={[
          styles.knob,
          {
            width: knobSize,
            height: knobSize,
            borderRadius: knobSize / 2,
            backgroundColor: accent,
            transform: [{ translateX: offset.x }, { translateY: offset.y }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knob: {
    opacity: 0.95,
  },
});
