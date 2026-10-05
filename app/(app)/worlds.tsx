import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { WorldCard } from '@/components/worlds/WorldCard';
import { useWorlds } from '@/hooks/useLocations';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/**
 * Phase 5.0 — pick a World; Proceed → lobby; See locations → browse board spaces.
 */
export default function WorldsScreen() {
  const { data, error, isLoading, isError } = useWorlds();
  const worlds = data?.worlds ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const selected = worlds.find((w) => w.worldId === selectedId) ?? null;
  const canAct = selected != null;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(app)');
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
          <Text style={styles.title} pointerEvents="none">
            Choose a World
          </Text>
          <View style={styles.headerSpacer} />
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
          <ScrollView
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            scrollEnabled={scrollEnabled}
          >
            {worlds.length === 0 ? (
              <Text style={styles.muted}>No worlds returned from the API.</Text>
            ) : null}
            {worlds.map((item) => (
              <View key={item.worldId} style={styles.cardCell}>
                <WorldCard
                  world={item}
                  selected={item.worldId === selectedId}
                  onSelect={() =>
                    setSelectedId((prev) =>
                      prev === item.worldId ? null : item.worldId,
                    )
                  }
                  onDragActiveChange={(active) => {
                    setScrollEnabled(!active);
                  }}
                />
              </View>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.footerBtn}>
            <Button
              label="See locations"
              variant="outline"
              disabled={!canAct}
              onPress={() => {
                if (!selected) {
                  return;
                }
                router.push({
                  pathname: '/(app)/locations',
                  params: { worldId: selected.worldId },
                });
              }}
            />
          </View>
          <View style={styles.footerBtn}>
            <Button
              label="Proceed"
              disabled={!canAct}
              onPress={() => {
                if (!selected) {
                  return;
                }
                router.push(`/(app)/lobby/${selected.worldId}`);
              }}
            />
          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: colors.brand,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingVertical: 12,
    flexGrow: 1,
  },
  cardCell: {
    width: '33.333%',
    padding: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  footerBtn: {
    flex: 1,
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
    width: '100%',
    paddingVertical: 24,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.danger,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
