import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Location } from '@/api/types';
import { BoardTile } from '@/components/board/BoardTile';
import { layoutBoardRing } from '@/components/board/boardLayout';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type BoardProps = {
  size: number;
  locations: Location[];
};

/**
 * Phase 4.1 — empty boardIndex ring geometry.
 */
export function Board({ size, locations }: BoardProps) {
  const layout = useMemo(() => layoutBoardRing(size, locations), [size, locations]);

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <View
        style={[
          styles.center,
          {
            left: layout.center.x,
            top: layout.center.y,
            width: layout.center.width,
            height: layout.center.height,
          },
        ]}
      >
        <Text style={styles.centerLabel}>Meetopoly</Text>
        <Text style={styles.centerHint}>Phase 4.1 · {layout.tiles.length} slots</Text>
      </View>
      {layout.tiles.map((tile) => (
        <BoardTile key={tile.boardIndex} tile={tile} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.brandMuted,
    overflow: 'hidden',
  },
  center: {
    position: 'absolute',
    backgroundColor: '#c5d9ce',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  centerLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.brand,
  },
  centerHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
});
