import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthError, AuthField } from "@/components/auth/AuthForm";
import { Button } from "@/components/ui/Button";
import { usernameInitials } from "@/hooks/useBoardWalk";
import { useMuteMic } from "@/hooks/useMuteMic";
import { useMuteVideo } from "@/hooks/useMuteVideo";
import {
  useAvatarActions,
  useSettingsUsernameForm,
} from "@/hooks/useProfile";
import { useSession } from "@/hooks/useSession";
import { formatUsername } from "@/lib/formatUsername";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

/**
 * Phase 9.2 — home Settings. Mute persists for Phase 10 voice.
 * Phase 16.1 — board camera off (`muteVideo`).
 * Phase 19.1 — username + avatar (edit/trash).
 * RN Switch (not @expo/ui) — Compose Host+Switch wraps label vertically on Android.
 * Leave stays board ⋯ only; report deferred until player picker + API.
 */
export default function SettingsScreen() {
  const { user } = useSession();
  const { muted, ready, setMuted } = useMuteMic();
  const {
    muted: videoMuted,
    ready: videoReady,
    setMuted: setVideoMuted,
  } = useMuteVideo();

  const currentUsername = user?.username?.trim() ?? "";
  const usernameForm = useSettingsUsernameForm(currentUsername);
  const avatar = useAvatarActions();

  const avatarUrl =
    typeof user?.avatarUrl === "string" ? user.avatarUrl.trim() : "";
  const initials = usernameInitials(
    formatUsername(currentUsername) || "You",
  );
  const hasPhoto = Boolean(avatarUrl);

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

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.columns}>
          <View style={styles.column}>
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
                Also available from the in-game mic control. Voice stays on even
                while you are in a location.
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
                Also available from the in-game camera control. Camera stays on
                even while you are in a location.
              </Text>
            </View>
          </View>

          <View style={styles.column}>
            <View style={styles.card}>
              <View style={styles.avatarRow}>
                <View
                  style={[
                    styles.avatarCircle,
                    hasPhoto ? styles.avatarCirclePhoto : null,
                  ]}
                  accessibilityLabel={
                    hasPhoto
                      ? "Profile photo"
                      : `Avatar initials ${initials}`
                  }
                >
                  {hasPhoto ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  )}
                  {avatar.busy ? (
                    <View style={styles.avatarBusy}>
                      <ActivityIndicator color={colors.onBrand} />
                    </View>
                  ) : null}
                </View>

                <View style={styles.avatarActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Change profile photo"
                    disabled={avatar.busy}
                    onPress={() => {
                      void avatar.pickAndUpload();
                    }}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.iconBtn,
                      pressed ? styles.pressed : null,
                      avatar.busy ? styles.iconBtnDisabled : null,
                    ]}
                  >
                    <Ionicons
                      name="create-outline"
                      size={20}
                      color={colors.brand}
                    />
                  </Pressable>
                  {hasPhoto ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Remove profile photo"
                      disabled={avatar.busy}
                      onPress={() => {
                        void avatar.deletePhoto();
                      }}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.iconBtn,
                        styles.iconBtnDanger,
                        pressed ? styles.pressed : null,
                        avatar.busy ? styles.iconBtnDisabled : null,
                      ]}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={colors.danger}
                      />
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <AuthField
                placeholder="Username"
                autoCapitalize="none"
                maxLength={20}
                value={usernameForm.values.username}
                onChangeText={(value) =>
                  usernameForm.setFieldValue("username", value)
                }
              />
              <AuthError message={usernameForm.error} />
              <Button
                label="Save username"
                loading={usernameForm.isSubmitting}
                disabled={!usernameForm.canSubmit}
                onPress={usernameForm.submit}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 88;

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
  scroll: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  columns: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  column: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.accent,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarCirclePhoto: {
    backgroundColor: colors.surface,
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatarInitials: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 28,
    color: colors.onBrand,
    letterSpacing: 0.5,
  },
  avatarBusy: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(20,32,27,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDanger: {
    borderColor: "rgba(180,60,50,0.35)",
  },
  iconBtnDisabled: {
    opacity: 0.5,
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
