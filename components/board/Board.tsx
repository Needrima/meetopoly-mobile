import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Location } from '@/api/types';
import { BoardCenter } from '@/components/board/BoardCenter';
import { BoardTile } from '@/components/board/BoardTile';
import { layoutBoardRing } from '@/components/board/boardLayout';
import { colors } from '@/theme/colors';

type BoardProps = {
  size: number;
  locations: Location[];
};

/**
 * Phase 4.4 — ring tiles + center brand + Chance/Chest decks.
 */
export function Board({ size, locations }: BoardProps) {
  const layout = useMemo(() => layoutBoardRing(size, locations), [size, locations]);
  const byIndex = useMemo(() => {
    const map = new Map<number, Location>();
    for (const loc of locations) {
      map.set(loc.boardIndex, loc);
    }
    return map;
  }, [locations]);

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <BoardCenter
        x={layout.center.x}
        y={layout.center.y}
        width={layout.center.width}
        height={layout.center.height}
        decks={layout.decks}
      />
      {layout.tiles.map((tile) => (
        <BoardTile
          key={tile.boardIndex}
          tile={tile}
          location={byIndex.get(tile.boardIndex)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.brandMuted,
    overflow: 'hidden',
  },
});
