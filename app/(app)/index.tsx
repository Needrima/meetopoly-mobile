import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { getApiBaseUrl } from "@/api/client";
import { useLogout } from "@/hooks/useAuth";
import { useHealth } from "@/hooks/useHealth";
import { useSession } from "@/hooks/useSession";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

export default function HomeScreen() {
  const { user } = useSession();
  const { data, error, isFetching, isLoading, refetch, isError } = useHealth();
  const logout = useLogout();
  const statusOk = data?.status === "ok";

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "right", "bottom", "left"]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.title}>Meetopoly</Text>
          <Text style={styles.subtitle}>
            Signed in as {user?.username ?? user?.email ?? "…"}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={isFetching}
            onPress={() => {
              void refetch();
            }}
            style={({ pressed }) => [
              styles.button,
              pressed || isFetching ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.buttonLabel}>
              {isFetching ? "Refreshing…" : "Refresh health"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.push("/(app)/locations");
            }}
            style={({ pressed }) => [
              styles.button,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.buttonLabel}>View locations</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.push("/(app)/board");
            }}
            style={({ pressed }) => [
              styles.button,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.buttonLabel}>Open board</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={logout.isPending}
            onPress={() => {
              void logout.mutateAsync();
            }}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed || logout.isPending ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.secondaryLabel}>
              {logout.isPending ? "Signing out…" : "Log out"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>API</Text>
          <Text style={styles.mono}>{getApiBaseUrl()}</Text>

          {isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.muted}>Calling /health…</Text>
            </View>
          ) : null}

          {isError ? (
            <Text style={styles.error}>
              {error instanceof Error ? error.message : "Request failed"}
            </Text>
          ) : null}

          {data ? (
            <View style={styles.metrics}>
              <Text
                style={[
                  styles.metricStrong,
                  statusOk ? styles.ok : styles.warn,
                ]}
              >
                status: {data.status}
              </Text>
              <Text style={styles.metric}>mongo: {data.mongo}</Text>
              <Text style={styles.metric}>redis: {data.redis}</Text>
              {data.version ? (
                <Text style={styles.muted}>version: {data.version}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 40,
    paddingHorizontal: 40,
    paddingVertical: 24,
  },
  left: {
    flex: 1,
    maxWidth: 320,
  },
  title: {
    marginBottom: 8,
    fontFamily: fonts.displayBold,
    fontSize: 36,
    color: colors.brand,
  },
  subtitle: {
    marginBottom: 24,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22,
    color: colors.muted,
  },
  button: {
    alignSelf: "flex-start",
    borderRadius: 12,
    backgroundColor: colors.brand,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 12,
  },
  secondaryButton: {
    alignSelf: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.onBrand,
  },
  secondaryLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.ink,
  },
  card: {
    flex: 1,
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 20,
  },
  cardEyebrow: {
    marginBottom: 4,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
  },
  mono: {
    marginBottom: 16,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },
  loading: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  metrics: {
    gap: 8,
  },
  metricStrong: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 18,
  },
  metric: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  muted: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  ok: {
    color: colors.success,
  },
  warn: {
    color: colors.warn,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.danger,
  },
});
