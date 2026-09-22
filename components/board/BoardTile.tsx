import { StyleSheet, Text, View } from 'react-native';

import type { TileLayout } from '@/components/board/boardLayout';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type BoardTileProps = {
  tile: TileLayout;
};

/**
 * Phase 4.1 — empty geometry slot (no color bands / icons yet).
 */
export function BoardTile({ tile }: BoardTileProps) {
  return (
    <View
      style={[
        styles.tile,
        {
          left: tile.x,
          top: tile.y,
          width: tile.width,
          height: tile.height,
        },
        tile.isCorner ? styles.corner : null,
      ]}
    >
      <Text style={styles.index} numberOfLines={1}>
        {tile.boardIndex}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  corner: {
    backgroundColor: colors.bg,
  },
  index: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    color: colors.muted,
  },
});
