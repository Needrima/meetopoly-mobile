import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import type { Location } from "@/api/types";
import type { GameDeed } from "@/api/types";
import { BoardAvatar } from "@/components/board/BoardAvatar";
import { BoardCenter } from "@/components/board/BoardCenter";
import { BoardPin } from "@/components/board/BoardPin";
import {
  BoardRemoteAvatar,
  type RemoteAvatarModel,
} from "@/components/board/BoardRemoteAvatar";
import { BoardTile } from "@/components/board/BoardTile";
import {
  DeckDrawFlyCard,
  type DeckDrawFlyModel,
} from "@/components/board/DeckDrawFlyCard";
import type { BoardPinModel } from "@/components/board/boardPins";
import { BOARD_WALK } from "@/components/board/boardConstants";
import {
  layoutBoardRing,
  type BoardLayout,
} from "@/components/board/boardLayout";
import { colors } from "@/theme/colors";

type BoardProps = {
  size: number;
  locations: Location[];
  layout?: BoardLayout;
  highlightedBoardIndex?: number | null;
  /** Phase 11.4b — boardIndex → MeetCoin cue while economy mode is on. */
  economyEligibleByIndex?: ReadonlyMap<number, number>;
  /** When true, non-eligible tiles dim. */
  economyModeActive?: boolean;
  /** boardIndex → owner pinColor for owned buyable spaces. */
  ownerColorByIndex?: ReadonlyMap<number, string>;
  /** Phase 11.4c — deeds for house/hotel/M markers. */
  deeds?: readonly GameDeed[];
  /** When set, tiles are tappable (omit while local buy modal is open). */
  onTilePress?: (boardIndex: number) => void;
  avatar?: {
    poseX: SharedValue<number>;
    poseY: SharedValue<number>;
    radius: number;
    initials: string;
    accent: string;
  } | null;
  /** Phase 7.2 — other players' presence avatars (pins stay from game WS). */
  remotes?: Omit<RemoteAvatarModel, "boardSize" | "radius">[];
  pins?: BoardPinModel[];
  /** Chance/Chest draw fly-off (before card modal). */
  deckDrawFly?: DeckDrawFlyModel | null;
  onDeckDrawFlyComplete?: (key: string) => void;
};

type StaticLayerProps = {
  layout: BoardLayout;
  locations: Location[];
  highlightedBoardIndex: number | null;
  economyEligibleByIndex?: ReadonlyMap<number, number>;
  economyModeActive?: boolean;
  ownerColorByIndex?: ReadonlyMap<number, string>;
  deeds?: readonly GameDeed[];
  onTilePress?: (boardIndex: number) => void;
};

/** Tiles + decks — isolated so pin hops do not rebuild the ring. */
const BoardStaticLayer = memo(function BoardStaticLayer({
  layout,
  locations,
  highlightedBoardIndex,
  economyEligibleByIndex,
  economyModeActive = false,
  ownerColorByIndex,
  deeds,
  onTilePress,
}: StaticLayerProps) {
  const byIndex = useMemo(() => {
    const map = new Map<number, Location>();
    for (const loc of locations) {
      map.set(loc.boardIndex, loc);
    }
    return map;
  }, [locations]);

  const deedByIndex = useMemo(() => {
    const map = new Map<number, GameDeed>();
    for (const d of deeds ?? []) {
      map.set(d.boardIndex, d);
    }
    return map;
  }, [deeds]);

  return (
    <>
      <BoardCenter
        x={layout.center.x}
        y={layout.center.y}
        width={layout.center.width}
        height={layout.center.height}
        decks={layout.decks}
      />
      {layout.tiles.map((tile) => {
        const eligibleAmount =
          economyEligibleByIndex?.get(tile.boardIndex) ?? null;
        const economyEligible = eligibleAmount != null;
        const deed = deedByIndex.get(tile.boardIndex);
        return (
          <BoardTile
            key={tile.boardIndex}
            tile={tile}
            location={byIndex.get(tile.boardIndex)}
            highlighted={highlightedBoardIndex === tile.boardIndex}
            economyEligible={economyEligible}
            economyDimmed={economyModeActive && !economyEligible}
            economyAmount={eligibleAmount}
            ownerColor={ownerColorByIndex?.get(tile.boardIndex) ?? null}
            houses={deed?.houses ?? 0}
            mortgaged={Boolean(deed?.mortgaged)}
            onPress={
              onTilePress
                ? () => {
                    onTilePress(tile.boardIndex);
                  }
                : undefined
            }
          />
        );
      })}
    </>
  );
});

const BoardPinsLayer = memo(function BoardPinsLayer({
  pins,
}: {
  pins: BoardPinModel[];
}) {
  return (
    <>
      {pins.map((p) => (
        <BoardPin
          key={p.id}
          x={p.x}
          y={p.y}
          radius={p.radius}
          accent={p.accent}
        />
      ))}
    </>
  );
});

const BoardRemotesLayer = memo(function BoardRemotesLayer({
  remotes,
  radius,
  boardSize,
}: {
  remotes: Omit<RemoteAvatarModel, "boardSize" | "radius">[];
  radius: number;
  boardSize: number;
}) {
  return (
    <>
      {remotes.map((r) => (
        <BoardRemoteAvatar
          key={r.pose.userId}
          pose={r.pose}
          accent={r.accent}
          radius={radius}
          boardSize={boardSize}
        />
      ))}
    </>
  );
});

/**
 * Ring + decks + Reanimated avatar + pins + nearest-tile glow.
 * Pin hops only re-render the pins layer so avatar motion stays smooth.
 */
export function Board({
  size,
  locations,
  layout: layoutProp,
  highlightedBoardIndex = null,
  economyEligibleByIndex,
  economyModeActive = false,
  ownerColorByIndex,
  deeds,
  onTilePress,
  avatar,
  remotes = [],
  pins = [],
  deckDrawFly = null,
  onDeckDrawFlyComplete,
}: BoardProps) {
  const layout = useMemo(
    () => layoutProp ?? layoutBoardRing(size, locations),
    [layoutProp, size, locations],
  );
  const remoteRadius =
    avatar?.radius ?? layout.size * BOARD_WALK.avatarRadiusFrac;

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <BoardStaticLayer
        layout={layout}
        locations={locations}
        highlightedBoardIndex={highlightedBoardIndex}
        economyEligibleByIndex={economyEligibleByIndex}
        economyModeActive={economyModeActive}
        ownerColorByIndex={ownerColorByIndex}
        deeds={deeds}
        onTilePress={onTilePress}
      />
      <BoardPinsLayer pins={pins} />
      <BoardRemotesLayer
        remotes={remotes}
        radius={remoteRadius}
        boardSize={layout.size}
      />
      {avatar ? (
        <BoardAvatar
          poseX={avatar.poseX}
          poseY={avatar.poseY}
          radius={avatar.radius}
          initials={avatar.initials}
          accent={avatar.accent}
        />
      ) : null}
      {deckDrawFly && onDeckDrawFlyComplete ? (
        <DeckDrawFlyCard
          fly={deckDrawFly}
          onComplete={onDeckDrawFlyComplete}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.brandMuted,
    overflow: "hidden",
  },
});
