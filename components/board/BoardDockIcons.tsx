import { Pressable, StyleSheet, View } from "react-native";
import {
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

/** Disabled dock icon opacity (keep green fill). */
const DOCK_OFF_OPACITY = 0.35;

type BoardDockIconsProps = {
  rollActive: boolean;
  endActive: boolean;
  hubActive: boolean;
  /** Phase 13.1 — hold to peek board under auction modal. */
  peekActive?: boolean;
  /** Short tile code for hub a11y label when nearby. */
  hubCode?: string;
  onRoll?: () => void;
  onEndTurn?: () => void;
  onEnterHub?: () => void;
  onPeekIn?: () => void;
  onPeekOut?: () => void;
};

/**
 * Phase 11.4a — Roll / End / Hub icon boxes beside the joystick.
 * Phase 13.1 — Peek (eye-sharp) beside Hub; hold while auction is active.
 */
export function BoardDockIcons({
  rollActive,
  endActive,
  hubActive,
  peekActive = false,
  hubCode = "",
  onRoll,
  onEndTurn,
  onEnterHub,
  onPeekIn,
  onPeekOut,
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hold to peek board"
        accessibilityHint="Hold during an auction to see the board"
        accessibilityState={{ disabled: !peekActive }}
        disabled={!peekActive}
        onPressIn={() => {
          if (peekActive) {
            onPeekIn?.();
          }
        }}
        onPressOut={() => {
          onPeekOut?.();
        }}
        className="w-12 h-12 rounded-[12px] bg-[#1f7a45] items-center justify-center"
        style={!peekActive ? styles.off : undefined}
      >
        <Ionicons name="eye-sharp" size={24} color="white" />
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
