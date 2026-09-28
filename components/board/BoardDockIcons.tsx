import { Pressable, StyleSheet, View } from "react-native";
import {
  Feather,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

/** Disabled dock icon opacity (keep green fill). */
const DOCK_OFF_OPACITY = 0.35;

type BoardDockIconsProps = {
  rollActive: boolean;
  endActive: boolean;
  hubActive: boolean;
  /** Short tile code for hub a11y label when nearby. */
  hubCode?: string;
  onRoll?: () => void;
  onEndTurn?: () => void;
  onEnterHub?: () => void;
};

/**
 * Phase 11.4a — Roll / End / Hub icon boxes beside the joystick.
 */
export function BoardDockIcons({
  rollActive,
  endActive,
  hubActive,
  hubCode = "",
  onRoll,
  onEndTurn,
  onEnterHub,
}: BoardDockIconsProps) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Roll dice"
        accessibilityState={{ disabled: !rollActive }}
        disabled={!rollActive}
        onPress={() => {
          onRoll?.();
        }}
        className="w-12 h-12 rounded-[12px] bg-[#1f7a45] items-center justify-center"
        style={!rollActive ? styles.off : undefined}
      >
        <FontAwesome5 name="dice" size={24} color="white" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="End turn"
        accessibilityState={{ disabled: !endActive }}
        disabled={!endActive}
        onPress={() => {
          onEndTurn?.();
        }}
        className="w-12 h-12 rounded-[12px] bg-[#1f7a45] items-center justify-center"
        style={!endActive ? styles.off : undefined}
      >
        <Feather name="arrow-right" size={24} color="white" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          hubActive && hubCode ? `Enter ${hubCode}` : "Enter hub"
        }
        accessibilityState={{ disabled: !hubActive }}
        disabled={!hubActive}
        onPress={() => {
          onEnterHub?.();
        }}
        className="w-12 h-12 rounded-[12px] bg-[#1f7a45] items-center justify-center"
        style={!hubActive ? styles.off : undefined}
      >
        <MaterialCommunityIcons name="hub" size={24} color="white" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  off: {
    opacity: DOCK_OFF_OPACITY,
  },
});
