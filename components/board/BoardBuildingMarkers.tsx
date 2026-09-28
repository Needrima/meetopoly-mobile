import { StyleSheet, Text, View } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

import type { BoardSide } from "@/components/board/boardLayout";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

type BoardBuildingMarkersProps = {
  side: BoardSide;
  /** 0–5; 5 = hotel. Ignored when mortgaged. */
  houses: number;
  mortgaged: boolean;
  /** Short edge of the tile — scales marker size. */
  minEdge: number;
};

/**
 * Phase 11.4c — houses (1–4), hotel (5), or M on mortgaged deeds.
 * Sit on the color-band edge (toward board center).
 */
export function BoardBuildingMarkers({
  side,
  houses,
  mortgaged,
  minEdge,
}: BoardBuildingMarkersProps) {
  if (!mortgaged && houses < 1) {
    return null;
  }

  const mark = Math.max(6, Math.min(11, Math.floor(minEdge * 0.2)));
  const strip = markerStripStyle(side);

  if (mortgaged) {
    return (
      <View pointerEvents="none" style={[styles.strip, strip]}>
        <View style={[styles.mortgageBadge, { minWidth: mark + 4, height: mark + 2 }]}>
          <Text style={[styles.mortgageM, { fontSize: Math.max(7, mark - 2) }]}>
            M
          </Text>
        </View>
      </View>
    );
  }

  if (houses >= 5) {
    return (
      <View pointerEvents="none" style={[styles.strip, strip]}>
        <FontAwesome5 name="hotel" size={mark} color={colors.danger} />
      </View>
    );
  }

  const count = Math.min(4, houses);
  return (
    <View pointerEvents="none" style={[styles.strip, strip, styles.houseRow]}>
      {Array.from({ length: count }, (_, i) => (
        <FontAwesome5
          key={i}
          name="home"
          size={mark - 1}
          color={colors.success}
        />
      ))}
    </View>
  );
}

/** Align markers with the color band (edge toward board center). */
function markerStripStyle(side: BoardSide): {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  flexDirection: "row" | "column";
} {
  const pad = 1;
  switch (side) {
    case "bottom":
      return {
        left: pad,
        right: pad,
        top: pad,
        flexDirection: "row",
      };
    case "top":
      return {
        left: pad,
        right: pad,
        bottom: pad,
        flexDirection: "row",
      };
    case "left":
      return {
        top: pad,
        bottom: pad,
        right: pad,
        flexDirection: "column",
      };
    case "right":
      return {
        top: pad,
        bottom: pad,
        left: pad,
        flexDirection: "column",
      };
  }
}

const styles = StyleSheet.create({
  strip: {
    position: "absolute",
    zIndex: 6,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  houseRow: {
    gap: 1,
  },
  mortgageBadge: {
    backgroundColor: colors.ink,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  mortgageM: {
    fontFamily: fonts.bodyBold,
    color: colors.onBrand,
    fontWeight: "700",
  },
});
