import { StyleSheet, Text, View } from 'react-native';

import type { Location } from '@/api/types';
import type { TileLayout } from '@/components/board/boardLayout';
import { bandStyle, tileVisual } from '@/components/board/tileStyle';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type BoardTileProps = {
  tile: TileLayout;
  location?: Location;
};

/**
 * Phase 4.2 — geometry + color band / kind fill (no icons yet).
 */
export function BoardTile({ tile, location }: BoardTileProps) {
  const visual = tileVisual(location, { isCorner: tile.isCorner });
  const band =
    visual.bandColor != null
      ? bandStyle(tile.side, tile.width, tile.height, visual.bandFraction)
      : null;

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
      <Text style={styles.index} numberOfLines={1}>
        {tile.boardIndex}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
  },
  index: {
    fontFamily: fonts.bodyMedium,
    fontSize: 8,
    color: colors.muted,
    zIndex: 1,
  },
});
