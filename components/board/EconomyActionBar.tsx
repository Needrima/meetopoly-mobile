import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { EconomyMode } from "@/lib/economyEligibility";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

type MciName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const ACTIONS: {
  mode: EconomyMode | "trade";
  label: string;
  icon: MciName;
  tone: "green" | "red";
}[] = [
  { mode: "build", label: "Build", icon: "home-plus", tone: "green" },
  { mode: "sell", label: "Sell", icon: "home-minus", tone: "green" },
  { mode: "mortgage", label: "Mortgage", icon: "bank", tone: "green" },
  { mode: "redeem", label: "Redeem", icon: "lock-open-variant", tone: "green" },
  { mode: "trade", label: "Trade", icon: "swap-horizontal", tone: "red" },
];

type EconomyActionBarProps = {
  activeMode: EconomyMode | null;
  enabled: boolean;
  /** Phase 13.3 — enable TRADE CTA. */
  tradeEnabled?: boolean;
  onSelect: (mode: EconomyMode) => void;
  onTrade?: () => void;
};

/**
 * Phase 11.4b — same dock-style boxes as Roll/End/Hub, row above them.
 * Phase 13.3 — Trade opens board trade overlay.
 */
export function EconomyActionBar({
  activeMode,
  enabled,
  tradeEnabled = false,
  onSelect,
  onTrade,
}: EconomyActionBarProps) {
  return (
    <View style={styles.wrap}>
      {ACTIONS.map((a) => {
        const isTrade = a.mode === "trade";
        const active = !isTrade && activeMode === a.mode;
        const disabled = isTrade
          ? !enabled || !tradeEnabled
          : !enabled;
        const bg =
          a.tone === "red"
            ? "bg-[#C23B2A]"
            : active
              ? "bg-[#148F6A]"
              : "bg-[#1f7a45]";
        return (
          <Pressable
            key={a.mode}
            accessibilityRole="button"
            accessibilityState={{ disabled, selected: active }}
            accessibilityLabel={a.label}
            disabled={disabled}
            onPress={() => {
              if (a.mode === "trade") {
                onTrade?.();
              } else {
                onSelect(a.mode);
              }
            }}
            className={`w-12 h-12 rounded-[12px] items-center justify-center ${bg}`}
            style={disabled ? styles.off : active ? styles.active : undefined}
          >
            <MaterialCommunityIcons name={a.icon} size={18} color="white" />
            <Text style={styles.label} numberOfLines={1}>
              {a.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 7,
    letterSpacing: 0.2,
    textTransform: "uppercase",
    color: colors.onBrand,
    marginTop: 1,
  },
  off: {
    opacity: 0.35,
  },
  active: {
    opacity: 1,
    transform: [{ scale: 0.96 }],
  },
});
