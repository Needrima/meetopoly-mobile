import { StyleSheet, Text, View } from "react-native";
import { MotiView } from "moti";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { EconomyMode } from "@/lib/economyEligibility";
import { economyModeCopy } from "@/lib/economyEligibility";
import { Button } from "@/components/ui/Button";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

/** Inset from board free-center edge so the sheet sits just inside Chance/Chest. */
const CENTER_INSET = 12;

type EconomyModeSheetProps = {
  mode: EconomyMode | null;
  visible: boolean;
  /** Board free-center side length (Chance/Chest area); sheet is square ≈ this − 12. */
  centerSide: number;
  /** Close exits the mode (sheet + highlights/dim). */
  onClose: () => void;
};

/**
 * Phase 11.4b — how-to sheet sized to the board free center.
 * Close exits mode entirely so board dim/highlight clears.
 */
export function EconomyModeSheet({
  mode,
  visible,
  centerSide,
  onClose,
}: EconomyModeSheetProps) {
  if (!visible || !mode) {
    return null;
  }
  const copy = economyModeCopy(mode);
  const side = Math.max(160, Math.floor(centerSide - CENTER_INSET));

  return (
    <View style={styles.host} pointerEvents="box-none">
      <View style={styles.backdrop} />
      <View style={styles.center} pointerEvents="box-none">
        <MotiView
          key={mode}
          from={{ opacity: 0, scale: 0.94, translateY: 12 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 220 }}
          style={[styles.sheet, { width: side, height: side }]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{copy.title}</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.bodyText}>{copy.body}</Text>
            <Text style={styles.note}>Note: {copy.note}</Text>
            <View style={styles.graphic}>
              <MaterialCommunityIcons
                name={
                  mode === "mortgage" || mode === "redeem" ? "bank" : "home"
                }
                size={28}
                color={colors.brand}
              />
            </View>
            <View style={styles.closeWrap}>
              <Button label="Close" onPress={onClose} style={styles.closeBtn} />
            </View>
          </View>
        </MotiView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...(StyleSheet.absoluteFill as object),
    zIndex: 45,
    elevation: 45,
  },
  backdrop: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: colors.overlay,
  },
  center: {
    ...(StyleSheet.absoluteFill as object),
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    borderRadius: 14,
    backgroundColor: colors.surface,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.brand,
  },
  header: {
    backgroundColor: colors.brand,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  title: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 18,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.onBrand,
  },
  body: {
    flex: 1,
    padding: 12,
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bodyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
    textAlign: "center",
  },
  note: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 15,
    color: colors.muted,
    textAlign: "center",
  },
  graphic: {
    width: 56,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  closeWrap: {
    alignSelf: "stretch",
    marginTop: "auto",
  },
  closeBtn: {
    height: 40,
  },
});
