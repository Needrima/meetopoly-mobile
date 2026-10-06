import { Image, StyleSheet, Text, View } from 'react-native';

import { fonts } from '@/theme/fonts';

type AvatarPodProps = {
  initials: string;
  accent: string;
  /** Face radius in px (board uses ~radius * 1.55 for face). */
  radius?: number;
  /** Public profile photo — circular face; border uses accent (Phase 19.1). */
  imageUrl?: string | null;
};

/**
 * Static board-style avatar (pod + face callout) for overlays / sheets.
 * Matches `BoardAvatar` look without Reanimated pose.
 */
export function AvatarPod({
  initials,
  accent,
  radius = 18,
  imageUrl = null,
}: AvatarPodProps) {
  const podW = radius * 1.7;
  const podH = radius * 0.85;
  const face = radius * 1.55;
  const ink = inkForAccent(accent);
  const photo = typeof imageUrl === 'string' ? imageUrl.trim() : '';
  const faceBorder = photo ? accent : ink;

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
            borderColor: faceBorder,
            marginBottom: -face * 0.12,
          },
        ]}
      >
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={{
              width: face,
              height: face,
              borderRadius: face / 2,
            }}
            resizeMode="cover"
          />
        ) : (
          <Text
            style={[
              styles.initials,
              { color: ink, fontSize: Math.max(9, face * 0.38) },
            ]}
          >
            {initials}
          </Text>
        )}
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
    overflow: 'hidden',
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
