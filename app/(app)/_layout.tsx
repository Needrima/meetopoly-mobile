import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useMe } from "@/hooks/useAuth";
import { BoardSessionProvider } from "@/hooks/useBoardSession";
import { useSession } from "@/hooks/useSession";
import { colors } from "@/theme/colors";

export default function AppLayout() {
  const { token, ready } = useSession();
  const me = useMe(Boolean(token));

  if (!ready || (token && me.isLoading)) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <BoardSessionProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </BoardSessionProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
});
