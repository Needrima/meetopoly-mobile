import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Location } from '@/api/types';
import type { BoardSide, TileLayout } from '@/components/board/boardLayout';
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
  /** Owner pin color chip when this space has a deed. */
  ownerColor?: string | null;
  /** Tap opens tile info; omit / undefined while buyer has buy modal open. */
  onPress?: () => void;
};

/** Outer-corner inset for ownership chip (away from board-center color band). */
function ownerChipStyle(
  side: BoardSide,
): { left?: number; right?: number; top?: number; bottom?: number } {
  const inset = 2;
  switch (side) {
    case 'bottom':
      return { right: inset, bottom: inset };
    case 'top':
      return { left: inset, top: inset };
    case 'left':
      return { left: inset, bottom: inset };
    case 'right':
      return { right: inset, top: inset };
  }
}

/**
 * Absolute tile frame; memoized so nearby glow does not redraw the whole ring.
 */
function BoardTileInner({
  tile,
  location,
  highlighted = false,
  ownerColor = null,
  onPress,
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
  const chipSize = Math.max(5, Math.min(8, Math.floor(minEdge * 0.14)));

  const longCorner = locLongCornerLabel(location);
  const iconPath = location?.assets?.icon;
  const isPlane = Boolean(iconPath?.includes('plane'));
  const isGoArrow = isGoArrowIcon(iconPath);

  const iconTransforms = [
    ...(isPlane ? [{ rotate: planeIconRotation(tile.side) }] : []),
    ...(isGoArrow ? [{ scaleX: -1 as const }] : []),
  ];

  const fontSize = labelFontSize(location, tile.isCorner, minEdge);

  const frameStyle = [
    styles.tile,
    {
      left: tile.x,
      top: tile.y,
      width: tile.width,
      height: tile.height,
      backgroundColor: visual.fill,
    },
    highlighted ? styles.tileGlow : null,
  ];

  const body = (
    <>
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

      {ownerColor ? (
        <View
          pointerEvents="none"
          style={[
            styles.ownerChip,
            ownerChipStyle(tile.side),
            {
              width: chipSize,
              height: chipSize,
              borderRadius: chipSize / 2,
              backgroundColor: ownerColor,
            },
          ]}
        />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={frameStyle}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={location?.name ?? `Space ${tile.boardIndex}`}
      >
        {body}
      </Pressable>
    );
  }

  return <View style={frameStyle}>{body}</View>;
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
  ownerChip: {
    position: 'absolute',
    zIndex: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,32,27,0.35)',
  },
});
