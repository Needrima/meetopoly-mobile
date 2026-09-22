import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Location } from '@/api/types';
import { DEFAULT_WORLD_ID, useLocations } from '@/hooks/useLocations';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

function priceLabel(loc: Location): string {
  if (loc.kind === 'special') {
    return '—';
  }
  return `$${loc.price}`;
}

function LocationRow({ item }: { item: Location }) {
  return (
    <View style={styles.row}>
      <Text style={styles.index}>{item.boardIndex}</Text>
      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.meta}>
          {item.kind}
          {item.countryCode ? ` · ${item.countryCode}` : ''}
        </Text>
      </View>
      <Text style={styles.price}>{priceLabel(item)}</Text>
    </View>
  );
}

export default function LocationsScreen() {
  const { data, error, isFetching, isLoading, refetch, isError } = useLocations(DEFAULT_WORLD_ID);
  const locations = data?.locations ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.back();
          }}
          style={({ pressed }) => [styles.back, pressed ? styles.pressed : null]}
        >
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Locations</Text>
          <Text style={styles.subtitle}>
            {DEFAULT_WORLD_ID} · {locations.length} spaces
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={isFetching}
          onPress={() => {
            void refetch();
          }}
          style={({ pressed }) => [styles.refresh, pressed || isFetching ? styles.pressed : null]}
        >
          <Text style={styles.refreshLabel}>{isFetching ? '…' : 'Refresh'}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.muted}>Loading {DEFAULT_WORLD_ID}…</Text>
        </View>
      ) : null}

      {isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>
            {error instanceof Error ? error.message : 'Failed to load locations'}
          </Text>
        </View>
      ) : null}

      {!isLoading && !isError ? (
        <FlatList
          contentContainerStyle={styles.list}
          data={locations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LocationRow item={item} />}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.brand,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: colors.brand,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  refresh: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  refreshLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
  },
  pressed: {
    opacity: 0.7,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  muted: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.danger,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  index: {
    width: 28,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'right',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.ink,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    textTransform: 'capitalize',
  },
  price: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.ink,
    minWidth: 48,
    textAlign: 'right',
  },
});
