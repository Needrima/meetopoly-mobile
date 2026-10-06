import { useCallback, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FlashList, type ListRenderItem } from "@shopify/flash-list";

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
  /** Location display name for “In {name}” (ellipsizes; count stays visible). */
  locationName?: string;
  /** Live / timer strip under the title (Phase 17.1). */
  statusSlot?: ReactNode;
  /** Leave control (top-right of this rail). */
  headerRight?: ReactNode;
  /** Board seat-style player info (does not change cell layout). */
  onPressPerson?: (row: HubRosterRow) => void;
};

const COLS = 2;
const AVATAR_RADIUS = 22;

/**
 * Phase 17.2 — right-rail hub roster: In {location} + count + Live/timer + 2-col grid.
 * Cell: AvatarPod center; name · country bottom-right. Local shows as `You`.
 * Cell bg is stable per userId and contrasts with the avatar accent.
 */
export function HubRoster({
  rows,
  maxPeers = 16,
  locationName,
  statusSlot,
  headerRight,
  onPressPerson,
}: HubRosterProps) {
  const shown = rows.slice(0, maxPeers);
  const place = locationName?.trim() || "hub";

  const renderItem = useCallback<ListRenderItem<HubRosterRow>>(
    ({ item }) => {
      const country =
        typeof item.country === "string" && item.country.trim()
          ? item.country.trim().toUpperCase()
          : "";
      const who = item.isLocal
        ? "You"
        : formatUsername(item.username) || "Player";
      const label = country ? `${who} · ${country}` : who;
      const initials = usernameInitials(
        item.isLocal
          ? formatUsername(item.username) || "You"
          : item.username,
      );
      const tile = rosterCellColors(item.userId, item.accent);
      return (
        <View style={styles.cellWrap}>
          <View
            style={[styles.cell, { backgroundColor: tile.backgroundColor }]}
          >
            <View style={styles.avatarWrap} pointerEvents="none">
              <AvatarPod
                initials={initials}
                accent={item.accent}
                radius={AVATAR_RADIUS}
                imageUrl={item.avatarUrl}
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
              onPress={() => onPressPerson?.(item)}
              style={styles.pressHit}
            />
          </View>
        </View>
      );
    },
    [onPressPerson],
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <View style={styles.titleRow}>
            <Text
              style={styles.eyebrow}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              In {place}
            </Text>
            <Text style={styles.count} numberOfLines={1}>
              {" "}
              · {shown.length}/{maxPeers}
            </Text>
          </View>
          {statusSlot}
        </View>
        {headerRight}
      </View>
      <FlashList
        data={shown}
        numColumns={COLS}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.userId}
        extraData={onPressPerson}
        ListEmptyComponent={
          <Text style={styles.empty}>Just you for now</Text>
        }
        renderItem={renderItem}
      />
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    width: "100%",
  },
  eyebrow: {
    flexShrink: 1,
    minWidth: 0,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "capitalize",
    color: colors.muted,
  },
  count: {
    flexShrink: 0,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "capitalize",
    color: colors.muted,
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    paddingBottom: 8,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  /** Half of former row gap (6) / vertical gap (~10). */
  cellWrap: {
    flex: 1,
    paddingHorizontal: 3,
    paddingBottom: 10,
  },
  cell: {
    width: "100%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    overflow: "hidden",
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
