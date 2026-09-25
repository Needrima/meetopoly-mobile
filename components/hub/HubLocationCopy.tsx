import { StyleSheet, Text, View } from 'react-native';

import { isLightHex } from '@/components/board/deedVisual';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type HubLocationCopyProps = {
  floorColor: string;
  title: string;
  shortName: string;
  blurb: string;
  /** Max lines for about — height-based ellipsis (Phase 9.0c). */
  blurbLines: number;
  paddingTop?: number;
};

/**
 * Location copy on the hub center rail — title/code always stay on-screen;
 * about ellipsizes below. pointerEvents none so avatars walk over it.
 */
export function HubLocationCopy({
  floorColor,
  title,
  shortName,
  blurb,
  blurbLines,
  paddingTop = 12,
}: HubLocationCopyProps) {
  const onFloor = isLightHex(floorColor) ? colors.ink : colors.onBrand;
  const mutedOnFloor = isLightHex(floorColor)
    ? colors.muted
    : 'rgba(255,255,255,0.9)';

  if (!title && !shortName && !blurb) {
    return null;
  }

  const lines = Math.max(1, Math.floor(blurbLines));

  return (
    <View style={[styles.root, { paddingTop }]} pointerEvents="none">
      <View style={styles.header} pointerEvents="none">
        {title ? (
          <Text style={[styles.title, { color: onFloor }]} numberOfLines={2}>
            {title}
          </Text>
        ) : null}
        {shortName ? (
          <Text style={[styles.shortName, { color: onFloor }]}>
            {shortName}
          </Text>
        ) : null}
      </View>
      {blurb ? (
        <Text
          style={[styles.body, { color: mutedOnFloor }]}
          numberOfLines={lines}
          ellipsizeMode="tail"
        >
          {blurb}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...(StyleSheet.absoluteFill as object),
    zIndex: 1,
    elevation: 0,
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 8,
    alignItems: 'center',
    // Top-anchored so long about never pushes the name off-screen.
    justifyContent: 'flex-start',
  },
  header: {
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    width: '100%',
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    textAlign: 'center',
  },
  shortName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    alignSelf: 'stretch',
    flexShrink: 1,
  },
});
