import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useMuteMic } from "@/hooks/useMuteMic";
import { useMuteVideo } from "@/hooks/useMuteVideo";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

/**
 * Phase 9.2 — home Settings. Mute persists for Phase 10 voice.
 * Phase 16.1 — board camera off (`muteVideo`).
 * RN Switch (not @expo/ui) — Compose Host+Switch wraps label vertically on Android.
 * Leave stays board ⋯ only; report deferred until player picker + API.
 */
export default function SettingsScreen() {
  const { muted, ready, setMuted } = useMuteMic();
  const {
    muted: videoMuted,
    ready: videoReady,
    setMuted: setVideoMuted,
  } = useMuteVideo();

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "right", "bottom", "left"]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(app)");
            }
          }}
          hitSlop={8}
          style={({ pressed }) => [
            styles.backBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.brand} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Microphone</Text>
          <Switch
            value={muted}
            onValueChange={setMuted}
            disabled={!ready}
            trackColor={{ false: colors.border, true: colors.brandMuted }}
            thumbColor={muted ? colors.onBrand : colors.surface}
            ios_backgroundColor={colors.border}
            accessibilityLabel="Microphone"
          />
        </View>
        <Text style={styles.hint}>
          Also available from the in-game mic control. Voice stays on even while
          you are in a location.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Camera</Text>
          <Switch
            value={videoMuted}
            onValueChange={setVideoMuted}
            disabled={!videoReady}
            trackColor={{ false: colors.border, true: colors.brandMuted }}
            thumbColor={videoMuted ? colors.onBrand : colors.surface}
            ios_backgroundColor={colors.border}
            accessibilityLabel="Camera"
          />
        </View>
        <Text style={styles.hint}>
          Also available from the in-game camera control. Camera stays on even
          while you are in a location.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.brand,
  },
  card: {
    marginTop: 8,
    maxWidth: 480,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 44,
  },
  label: {
    flex: 1,
    flexShrink: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.ink,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  pressed: {
    opacity: 0.75,
  },
});
