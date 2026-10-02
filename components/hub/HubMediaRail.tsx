import { StyleSheet, Text, View } from "react-native";

import type { BoardPresenceStatus } from "@/hooks/useBoardPresence";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

type HubMediaRailProps = {
  presenceStatus: BoardPresenceStatus;
  dcOpen: boolean;
  /** Optional time-bank label for the local player (game hubs). */
  bankLabel?: string | null;
};

function presenceLabel(
  status: BoardPresenceStatus,
  dcOpen: boolean,
): string {
  if (status === "connected" && dcOpen) {
    return "Live";
  }
  if (status === "connecting" || status === "connected") {
    return "Connecting…";
  }
  if (status === "error") {
    return "Hub full or error";
  }
  return "";
}

/**
 * Phase 17.1 — compact Live + turn timer for the right hub rail header.
 * Chat lives on the left (`HubChatRail`).
 */
export function HubMediaRail({
  presenceStatus,
  dcOpen,
  bankLabel,
}: HubMediaRailProps) {
  const live = presenceLabel(presenceStatus, dcOpen);

  return (
    <View style={styles.root}>
      {live ? (
        <Text
          style={[
            styles.status,
            presenceStatus === "error" ? styles.statusError : null,
          ]}
          numberOfLines={1}
        >
          {live}
        </Text>
      ) : null}
      {bankLabel ? (
        <Text style={styles.bank} numberOfLines={1}>
          Time · {bankLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 2,
    minWidth: 0,
    flexShrink: 1,
  },
  status: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.brand,
  },
  statusError: {
    color: colors.danger,
  },
  bank: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink,
  },
});
