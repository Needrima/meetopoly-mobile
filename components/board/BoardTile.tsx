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
  /** Soft outline when this tile is the nearest Enter target. */
  highlighted?: boolean;
};

/**
 * Phase 4.3 — absolute tile frame; same label size on every side.
 */
export function BoardTile({ tile, location, highlighted = false }: BoardTileProps) {
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

  // Equal padding so icon+label stay optically centered (band is overlay only).
  const contentPad = 3;

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
        highlighted ? styles.tileGlow : null,
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
            padding: contentPad,
            transform: [{ rotate: contentRotation(tile.side) }],
          },
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
  tileGlow: {
    borderWidth: 2,
    borderColor: colors.accent,
    zIndex: 4,
    shadowColor: colors.accent,
    shadowOpacity: 0.55,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
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
