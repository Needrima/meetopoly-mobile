import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { fonts } from '@/theme/fonts';

type BoardAvatarProps = {
  poseX: SharedValue<number>;
  poseY: SharedValue<number>;
  radius: number;
  initials: string;
  accent: string;
  /** Local avatar sits above remotes (default 20). */
  zIndex?: number;
};

/**
 * Walking avatar: pod + initial callout.
 * Position via Reanimated shared values (UI thread; no React re-render per frame).
 */
export function BoardAvatar({
  poseX,
  poseY,
  radius,
  initials,
  accent,
  zIndex = 20,
}: BoardAvatarProps) {
  const podW = radius * 1.7;
  const podH = radius * 0.85;
  const face = radius * 1.55;
  const ink = inkForAccent(accent);
  const rootH = podH + face * 0.7;
  const offsetY = podH / 2 + face * 0.55;

  const animStyle = useAnimatedStyle(() => ({
    left: poseX.value - podW / 2,
    top: poseY.value - offsetY,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.root,
        {
          width: podW,
          height: rootH,
          zIndex,
        },
        animStyle,
      ]}
      accessibilityLabel={`Avatar ${initials}`}
    >
      <View
        style={[
          styles.face,
          {
            width: face,
            height: face,
            borderRadius: face / 2,
            backgroundColor: accent,
            borderColor: ink,
            marginBottom: -face * 0.12,
          },
        ]}
      >
        <Text
          style={[
            styles.initials,
            { color: ink, fontSize: Math.max(9, face * 0.38) },
          ]}
        >
          {initials}
        </Text>
      </View>
      <View
        style={[
          styles.pod,
          {
            width: podW,
            height: podH,
            borderRadius: podH / 2,
            backgroundColor: accent,
            borderColor: ink,
          },
        ]}
      />
    </Animated.View>
  );
}

function inkForAccent(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) {
    return '#14201B';
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.62 ? '#14201B' : '#FFFFFF';
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  face: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.5,
  },
  pod: {
    borderWidth: 2,
    opacity: 0.92,
  },
});
