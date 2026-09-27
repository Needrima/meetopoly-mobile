import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '@/theme/fonts';

type AvatarPodProps = {
  initials: string;
  accent: string;
  /** Face radius in px (board uses ~radius * 1.55 for face). */
  radius?: number;
};

/**
 * Static board-style avatar (pod + initial callout) for overlays / sheets.
 * Matches `BoardAvatar` look without Reanimated pose.
 */
export function AvatarPod({
  initials,
  accent,
  radius = 18,
}: AvatarPodProps) {
  const podW = radius * 1.7;
  const podH = radius * 0.85;
  const face = radius * 1.55;
  const ink = inkForAccent(accent);

  return (
    <View
      pointerEvents="none"
      style={[styles.root, { width: podW }]}
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
