import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Location } from '@/api/types';
import type { TileLayout } from '@/components/board/boardLayout';
import { resolveBoardIcon } from '@/components/board/iconRegistry';
import {
  contentRotation,
  isGoArrowIcon,
  labelFontSize,
  locLongCornerLabel,
  planeIconRotation,
  shortTileName,
} from '@/components/board/tileLabel';
import { bandStyle, tileVisual } from '@/components/board/tileStyle';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type BoardTileProps = {
  tile: TileLayout;
  location?: Location;
  /** Soft outline when this tile is the nearest Enter target. */
  highlighted?: boolean;
};

/**
 * Absolute tile frame; memoized so nearby glow does not redraw the whole ring.
 */
function BoardTileInner({
  tile,
  location,
  highlighted = false,
}: BoardTileProps) {
  const visual = tileVisual(location, { isCorner: tile.isCorner });
  const band =
    visual.bandColor != null
      ? bandStyle(tile.side, tile.width, tile.height, visual.bandFraction)
      : null;

  const Icon = resolveBoardIcon(location?.assets?.icon);
  const label = shortTileName(location);
  const minEdge = Math.min(tile.width, tile.height);
  const iconSize = Math.max(
    10,
    Math.min(
      tile.isCorner ? 22 : 18,
      Math.floor(minEdge * (tile.isCorner ? 0.38 : 0.42)),
    ),
  );

  const contentPad = minEdge < 36 ? 2 : 3;

  const longCorner = locLongCornerLabel(location);
  const iconPath = location?.assets?.icon;
  const isPlane = Boolean(iconPath?.includes('plane'));
  const isGoArrow = isGoArrowIcon(iconPath);

  const iconTransforms = [
    ...(isPlane ? [{ rotate: planeIconRotation(tile.side) }] : []),
    ...(isGoArrow ? [{ scaleX: -1 as const }] : []),
  ];

  const fontSize = labelFontSize(location, tile.isCorner, minEdge);

  return (
    <View
      style={[
        styles.tile,
        {
          left: tile.x,
          top: tile.y,
          width: tile.width,
          height: tile.height,
          backgroundColor: visual.fill,
        },
        highlighted ? styles.tileGlow : null,
      ]}
    >
      {band && visual.bandColor ? (
        <View
          style={[
            styles.band,
            {
              left: band.left,
              top: band.top,
              width: band.width,
              height: band.height,
              backgroundColor: visual.bandColor,
            },
          ]}
        />
      ) : null}

      <View
        style={[
          styles.content,
          {
            padding: contentPad,
            transform: [{ rotate: contentRotation(tile.side) }],
          },
        ]}
      >
        {Icon ? (
          <View
            style={
              iconTransforms.length ? { transform: iconTransforms } : undefined
            }
          >
            <Icon width={iconSize} height={iconSize} color={colors.ink} />
          </View>
        ) : null}
        {label ? (
          <Text
            style={[
              styles.label,
              {
                fontSize,
                lineHeight: fontSize + 2,
              },
            ]}
            numberOfLines={1}
            allowFontScaling={false}
            {...(longCorner
              ? { adjustsFontSizeToFit: true, minimumFontScale: 0.7 }
              : {})}
          >
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export const BoardTile = memo(BoardTileInner);

const styles = StyleSheet.create({
  tile: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tileGlow: {
    borderWidth: 1,
    borderColor: colors.accent,
    zIndex: 4,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  band: {
    position: 'absolute',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    color: colors.ink,
    textAlign: 'center',
  },
});
