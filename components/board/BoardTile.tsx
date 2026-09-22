import { StyleSheet, Text, View } from "react-native";

import type { Location } from "@/api/types";
import type { TileLayout } from "@/components/board/boardLayout";
import { resolveBoardIcon } from "@/components/board/iconRegistry";
import { contentRotation, shortTileName } from "@/components/board/tileLabel";
import { bandStyle, tileVisual } from "@/components/board/tileStyle";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

type BoardTileProps = {
  tile: TileLayout;
  location?: Location;
};

/**
 * Phase 4.3 — color band + icon + short name (no walk yet).
 */
export function BoardTile({ tile, location }: BoardTileProps) {
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
    Math.min(22, Math.floor(minEdge * (tile.isCorner ? 0.38 : 0.42))),
  );
  const pad = band
    ? Math.max(band.width === tile.width ? band.height : band.width, 2) + 2
    : 3;

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

      <View
        style={[
          styles.content,
          {
            transform: [{ rotate: contentRotation(tile.side) }],
            padding: pad,
          },
        ]}
      >
        {Icon ? (
          <Icon width={iconSize} height={iconSize} color={colors.ink} />
        ) : null}
        {label ? (
          <Text
            style={[styles.label, { fontSize: minEdge < 36 ? 7 : 8 }]}
            numberOfLines={2}
          >
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    position: "absolute",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  band: {
    position: "absolute",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    color: colors.ink,
    textAlign: "center",
    lineHeight: 9,
  },
});
