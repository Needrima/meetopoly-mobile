import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type { Location } from '@/api/types';
import { BoardAvatar } from '@/components/board/BoardAvatar';
import { BoardCenter } from '@/components/board/BoardCenter';
import { BoardPin } from '@/components/board/BoardPin';
import { BoardTile } from '@/components/board/BoardTile';
import type { BoardPinModel } from '@/components/board/boardPins';
import { layoutBoardRing, type BoardLayout } from '@/components/board/boardLayout';
import { colors } from '@/theme/colors';

type BoardProps = {
  size: number;
  locations: Location[];
  layout?: BoardLayout;
  highlightedBoardIndex?: number | null;
  avatar?: {
    poseX: SharedValue<number>;
    poseY: SharedValue<number>;
    radius: number;
    initials: string;
    accent: string;
  } | null;
  pins?: BoardPinModel[];
};

/**
 * Ring + decks + Reanimated avatar + pins + nearest-tile glow.
 */
export function Board({
  size,
  locations,
  layout: layoutProp,
  highlightedBoardIndex = null,
  avatar,
  pins = [],
}: BoardProps) {
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
          highlighted={highlightedBoardIndex === tile.boardIndex}
        />
      ))}
      {pins.map((p) => (
        <BoardPin
          key={p.id}
          x={p.x}
          y={p.y}
          radius={p.radius}
          accent={p.accent}
        />
      ))}
      {avatar ? (
        <BoardAvatar
          poseX={avatar.poseX}
          poseY={avatar.poseY}
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

