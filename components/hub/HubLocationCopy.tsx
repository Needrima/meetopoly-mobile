import { StyleSheet, Text, View } from 'react-native';

import { isLightHex } from '@/components/board/deedVisual';
import { resolveBoardIcon } from '@/components/board/iconRegistry';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

const ICON_SIZE = 42;

type HubLocationCopyProps = {
  floorColor: string;
  title: string;
  shortName: string;
  blurb: string;
  /** Max lines for about — height-based ellipsis (Phase 9.0c). */
  blurbLines: number;
  /** Seed `assets.icon` path — resolved via board icon registry. */
  iconPath?: string | null;
  /** Symmetric vertical inset (e.g. safe-area top) so centering stays balanced. */
  paddingVertical?: number;
};

/**
 * Location copy on the hub center rail — icon + title/code + about, vertically
 * centered. pointerEvents none so avatars walk over it.
 */
export function HubLocationCopy({
  floorColor,
  title,
  shortName,
  blurb,
  blurbLines,
  iconPath,
  paddingVertical = 12,
}: HubLocationCopyProps) {
  const onFloor = isLightHex(floorColor) ? colors.ink : colors.onBrand;
  const mutedOnFloor = isLightHex(floorColor)
    ? colors.muted
    : 'rgba(255,255,255,0.9)';
  const Icon = resolveBoardIcon(iconPath);

  if (!Icon && !title && !shortName && !blurb) {
    return null;
  }

  const lines = Math.max(1, Math.floor(blurbLines));

  return (
    <View
      style={[styles.root, { paddingVertical }]}
      pointerEvents="none"
    >
      <View style={styles.stack} pointerEvents="none">
        {Icon ? (
          <Icon width={ICON_SIZE} height={ICON_SIZE} color={onFloor} />
        ) : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...(StyleSheet.absoluteFill as object),
    zIndex: 1,
    elevation: 0,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: {
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxHeight: '100%',
  },
  header: {
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    width: '100%',
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
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
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    alignSelf: 'stretch',
    flexShrink: 1,
  },
});
