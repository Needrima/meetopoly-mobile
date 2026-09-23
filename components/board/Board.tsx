import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Location } from '@/api/types';
import { BoardAvatar } from '@/components/board/BoardAvatar';
import { BoardCenter } from '@/components/board/BoardCenter';
import { BoardPin } from '@/components/board/BoardPin';
import { BoardTile } from '@/components/board/BoardTile';
import { layoutBoardRing, type BoardLayout } from '@/components/board/boardLayout';
import { colors } from '@/theme/colors';

type BoardProps = {
  size: number;
  locations: Location[];
  /** When provided, skips recomputing layout (share with walk hook). */
  layout?: BoardLayout;
  avatar?: {
    x: number;
    y: number;
    radius: number;
    initials: string;
    accent: string;
  } | null;
  pin?: {
    x: number;
    y: number;
    radius: number;
    accent: string;
  } | null;
};

/**
 * Phase 4.5 — ring tiles + center decks + local avatar + GO pin.
 */
export function Board({ size, locations, layout: layoutProp, avatar, pin }: BoardProps) {
  const layout = useMemo(
    () => layoutProp ?? layoutBoardRing(size, locations),
    [layoutProp, size, locations],
  );
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
      {pin ? (
        <BoardPin x={pin.x} y={pin.y} radius={pin.radius} accent={pin.accent} />
      ) : null}
      {avatar ? (
        <BoardAvatar
          x={avatar.x}
          y={avatar.y}
          radius={avatar.radius}
          initials={avatar.initials}
          accent={avatar.accent}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.brandMuted,
    overflow: 'hidden',
  },
});
