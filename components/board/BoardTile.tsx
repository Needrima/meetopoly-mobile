import { StyleSheet, Text, View } from "react-native";

import type { Location } from "@/api/types";
import type { TileLayout } from "@/components/board/boardLayout";
import { resolveBoardIcon } from "@/components/board/iconRegistry";
import {
  contentRotation,
  isGoArrowIcon,
  labelFontSize,
  locLongCornerLabel,
  planeIconRotation,
  shortTileName,
} from "@/components/board/tileLabel";
import { bandStyle, tileVisual } from "@/components/board/tileStyle";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

type BoardTileProps = {
  tile: TileLayout;
  location?: Location;
};

/**
 * Phase 4.3 — absolute tile frame; same label size on every side.
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
    Math.min(20, Math.floor(minEdge * (tile.isCorner ? 0.36 : 0.38))),
  );

  // Band only on the center-facing edge — keep other paddings small so codes fit.
  const bandDepth = band
    ? Math.max(band.width === tile.width ? band.height : band.width, 2)
    : 0;
  const contentPad = {
    paddingTop: tile.side === "bottom" ? bandDepth + 2 : 2,
    paddingBottom: tile.side === "top" ? bandDepth + 2 : 2,
    paddingLeft: tile.side === "right" ? bandDepth + 2 : 2,
    paddingRight: tile.side === "left" ? bandDepth + 2 : 2,
  };

  const longCorner = locLongCornerLabel(location);
  const iconPath = location?.assets?.icon;
  const isPlane = Boolean(iconPath?.includes("plane"));
  const isGoArrow = isGoArrowIcon(iconPath);

  const iconTransforms = [
    ...(isPlane ? [{ rotate: planeIconRotation(tile.side) }] : []),
    ...(isGoArrow ? [{ scaleX: -1 as const }] : []),
  ];

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
          contentPad,
          { transform: [{ rotate: contentRotation(tile.side) }] },
        ]}
      >
        {Icon ? (
          <View
            style={iconTransforms.length ? { transform: iconTransforms } : undefined}
          >
            <Icon width={iconSize} height={iconSize} color={colors.ink} />
          </View>
        ) : null}
        {label ? (
          <Text
            style={[
              styles.label,
              { fontSize: labelFontSize(location, tile.isCorner, minEdge) },
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
    lineHeight: 11,
  },
});
