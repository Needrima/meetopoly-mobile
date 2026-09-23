import { useState } from 'react';
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

import type { WorldSummary } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { useWorlds } from '@/hooks/useLocations';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/**
 * Phase 5.0 — pick a World; Continue → lobby (5.1+).
 */
export default function WorldsScreen() {
  const { data, error, isLoading, isError, isFetching, refetch } = useWorlds();
  const worlds = data?.worlds ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = worlds.find((w) => w.worldId === selectedId) ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(app)');
            }
          }}
          style={({ pressed }) => [styles.back, pressed ? styles.pressed : null]}
        >
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Choose a World</Text>
          <Text style={styles.subtitle}>
            Board packs to play · lobby matchmaking next
          </Text>
        </View>
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
          <Text style={styles.refreshLabel}>{isFetching ? '…' : 'Refresh'}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.muted}>Loading worlds…</Text>
        </View>
      ) : null}

      {isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>
            {error instanceof Error ? error.message : 'Failed to load worlds'}
          </Text>
        </View>
      ) : null}

      {!isLoading && !isError ? (
        <FlatList
          data={worlds}
          keyExtractor={(item) => item.worldId}
          contentContainerStyle={styles.list}
          numColumns={2}
          columnWrapperStyle={styles.row}
          ListEmptyComponent={
            <Text style={styles.muted}>No worlds returned from the API.</Text>
          }
          renderItem={({ item }) => (
            <WorldCard
              world={item}
              selected={item.worldId === selectedId}
              onPress={() => setSelectedId(item.worldId)}
            />
          )}
        />
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.footerHint} numberOfLines={2}>
          {selected
            ? `Selected ${selected.worldId} · ${selected.count} spaces`
            : 'Select a World to continue'}
        </Text>
        <Button
          label="Continue"
          disabled={!selected}
          onPress={() => {
            if (!selected) {
              return;
            }
            router.push(`/(app)/lobby/${selected.worldId}`);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

function WorldCard({
  world,
  selected,
  onPress,
}: {
  world: WorldSummary;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected ? styles.cardSelected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={styles.cardId} numberOfLines={1}>
        {world.worldId}
      </Text>
      <Text style={styles.cardMeta}>{world.count} spaces</Text>
    </Pressable>
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
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: colors.brand,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  refresh: {
    borderRadius: 10,
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.onBrand,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  row: {
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    marginBottom: 4,
  },
  cardSelected: {
    borderColor: colors.brand,
    borderWidth: 2,
    backgroundColor: colors.brandMuted,
  },
  cardId: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.ink,
  },
  cardMeta: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
    backgroundColor: colors.surface,
  },
  footerHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  muted: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.danger,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
