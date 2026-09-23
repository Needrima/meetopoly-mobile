import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '@/theme/fonts';

type BoardAvatarProps = {
  x: number;
  y: number;
  radius: number;
  initials: string;
  accent: string;
};

/**
 * Phase 4.5 — walking avatar: colored pod + 2-letter callout.
 * (x, y) = board-local center of the pod.
 */
export function BoardAvatar({ x, y, radius, initials, accent }: BoardAvatarProps) {
  const podW = radius * 1.7;
  const podH = radius * 0.85;
  const face = radius * 1.55;
  const ink = inkForAccent(accent);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.root,
        {
          left: x - podW / 2,
          top: y - podH / 2 - face * 0.55,
          width: podW,
          height: podH + face * 0.7,
        },
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
        <Text style={[styles.initials, { color: ink, fontSize: Math.max(9, face * 0.38) }]}>
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
    </View>
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
    zIndex: 20,
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
