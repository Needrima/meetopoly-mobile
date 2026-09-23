import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getApiBaseUrl } from '@/api/client';
import { useHealth } from '@/hooks/useHealth';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/**
 * __DEV__ health debug — reached from board ⋯ menu.
 */
export default function HealthScreen() {
  const { data, error, isFetching, isLoading, refetch, isError } = useHealth();
  const statusOk = data?.status === 'ok';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(app)/board');
            }
          }}
          style={({ pressed }) => [styles.back, pressed ? styles.pressed : null]}
        >
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Health</Text>
        <Pressable
          accessibilityRole="button"
          disabled={isFetching}
          onPress={() => {
            void refetch();
          }}
          style={({ pressed }) => [
            styles.refresh,
            pressed || isFetching ? styles.pressed : null,
          ]}
        >
          <Text style={styles.refreshLabel}>
            {isFetching ? '…' : 'Refresh'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.eyebrow}>API</Text>
        <Text style={styles.mono}>{getApiBaseUrl()}</Text>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.muted}>Calling /health…</Text>
          </View>
        ) : null}

        {isError ? (
          <Text style={styles.error}>
            {error instanceof Error ? error.message : 'Request failed'}
          </Text>
        ) : null}

        {data ? (
          <View style={styles.metrics}>
            <Text
              style={[styles.metricStrong, statusOk ? styles.ok : styles.warn]}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  back: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
  },
  title: {
    flex: 1,
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.brand,
  },
  refresh: {
    borderRadius: 10,
    backgroundColor: colors.brand,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  refreshLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.onBrand,
  },
  card: {
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 20,
  },
  eyebrow: {
    marginBottom: 4,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  mono: {
    marginBottom: 16,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },
  loading: {
    alignItems: 'center',
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
  pressed: {
    opacity: 0.75,
  },
});
