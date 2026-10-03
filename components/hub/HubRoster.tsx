import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AvatarPod } from "@/components/board/AvatarPod";
import type { PresenceRosterEntry } from "@/hooks/useBoardPresence";
import { usernameInitials } from "@/hooks/useBoardWalk";
import { formatUsername } from "@/lib/formatUsername";
import { rosterCellColors } from "@/lib/hubRosterCellBg";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

export type HubRosterRow = PresenceRosterEntry & {
  accent: string;
  isLocal?: boolean;
};

type HubRosterProps = {
  rows: HubRosterRow[];
  maxPeers?: number;
  /** Live / timer strip under the In hub count (Phase 17.1). */
  statusSlot?: ReactNode;
  /** Leave control (top-right of this rail). */
  headerRight?: ReactNode;
  /** Board seat-style player info (does not change cell layout). */
  onPressPerson?: (row: HubRosterRow) => void;
};

const COLS = 2;
const AVATAR_RADIUS = 22;

/**
 * Phase 17.2 — right-rail hub roster: In hub count + Live/timer + 2-col people grid.
 * Cell: AvatarPod center; name · country bottom-right. Local shows as `You`.
 * Cell bg is stable per userId and contrasts with the avatar accent.
 */
export function HubRoster({
  rows,
  maxPeers = 16,
  statusSlot,
  headerRight,
  onPressPerson,
}: HubRosterProps) {
  const shown = rows.slice(0, maxPeers);
  const cells: (HubRosterRow | null)[] = [...shown];
  while (cells.length % COLS !== 0) {
    cells.push(null);
  }
  const gridRows: (HubRosterRow | null)[][] = [];
  for (let i = 0; i < cells.length; i += COLS) {
    gridRows.push(cells.slice(i, i + COLS));
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={styles.eyebrow}>
            In hub · {shown.length}/{maxPeers}
          </Text>
          {statusSlot}
        </View>
        {headerRight}
      </View>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        bounces
      >
        {shown.length === 0 ? (
          <Text style={styles.empty}>Just you for now</Text>
        ) : (
          <View style={styles.grid}>
            {gridRows.map((row, rowIndex) => (
              <View
                key={`r${rowIndex}-${row.map((c) => c?.userId ?? "_").join("-")}`}
                style={styles.gridRow}
              >
                {row.map((cell, colIndex) => {
                  if (!cell) {
                    return (
                      <View
                        key={`empty-${rowIndex}-${colIndex}`}
                        style={styles.cellEmpty}
                      />
                    );
                  }
                  const country =
                    typeof cell.country === "string" && cell.country.trim()
                      ? cell.country.trim().toUpperCase()
                      : "";
                  const who = cell.isLocal
                    ? "You"
                    : formatUsername(cell.username) || "Player";
                  const label = country ? `${who} · ${country}` : who;
                  const initials = usernameInitials(
                    cell.isLocal
                      ? formatUsername(cell.username) || "You"
                      : cell.username,
                  );
                  const tile = rosterCellColors(cell.userId, cell.accent);
                  return (
                    <View
                      key={cell.userId}
                      style={[
                        styles.cell,
                        { backgroundColor: tile.backgroundColor },
                      ]}
                    >
                      <View style={styles.avatarWrap} pointerEvents="none">
                        <AvatarPod
                          initials={initials}
                          accent={cell.accent}
                          radius={AVATAR_RADIUS}
                        />
                      </View>
                      <Text
                        style={[styles.label, { color: tile.labelColor }]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${who} player info`}
                        onPress={() => onPressPerson?.(cell)}
                        style={styles.pressHit}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  headerMain: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    flexGrow: 0,
    paddingBottom: 8,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  grid: {
    gap: 10,
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 6,
  },
  cell: {
    flex: 1,
    minWidth: 0,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    overflow: "hidden",
  },
  cellEmpty: {
    flex: 1,
    minWidth: 0,
    aspectRatio: 1,
  },
  avatarWrap: {
    ...(StyleSheet.absoluteFill as object),
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    position: "absolute",
    right: 6,
    bottom: 4,
    maxWidth: "92%",
    textAlign: "right",
    fontFamily: fonts.body,
    fontSize: 10,
  },
  /** Same pattern as BoardSeatTile — hit target only, no layout change. */
  pressHit: {
    ...(StyleSheet.absoluteFill as object),
    zIndex: 1,
  },
});
