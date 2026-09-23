import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SeatSlot } from '@/components/lobby/SeatSlot';
import { Button } from '@/components/ui/Button';
import { useWorlds } from '@/hooks/useLocations';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

const SEAT_COUNT = 6;

/**
 * Phase 5.1 — lobby shell: 6 seats + Leave → World picker.
 * Matchmaking / bots / Ready land in 5.2–5.4.
 */
export default function LobbyScreen() {
  const params = useLocalSearchParams<{ worldId?: string | string[] }>();
  const worldId = Array.isArray(params.worldId)
    ? params.worldId[0]
    : params.worldId;

  const { data } = useWorlds();
  const world = data?.worlds.find((w) => w.worldId === worldId) ?? null;

  const leave = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/worlds');
    }
  };

  if (!worldId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.center}>
          <Text style={styles.error}>Missing World</Text>
          <Button label="Back to Worlds" onPress={leave} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={leave}
          style={({ pressed }) => [styles.back, pressed ? styles.pressed : null]}
        >
          <Text style={styles.backLabel}>Leave</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Lobby</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {world
              ? `${world.worldId} · ${world.count} spaces`
              : worldId}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <Text style={styles.hint}>
          Table seats (2–6). Matchmaking fills these next.
        </Text>
        <View style={styles.grid}>
          {Array.from({ length: SEAT_COUNT }, (_, i) => (
            <SeatSlot key={i} seatNumber={i + 1} />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerHint}>
          Waiting for players · Ready unlocks in a later step
        </Text>
        <Button label="Leave lobby" onPress={leave} />
      </View>
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
  headerSpacer: {
    width: 72,
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
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
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
    gap: 16,
    padding: 24,
  },
  error: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.danger,
  },
  pressed: {
    opacity: 0.8,
  },
});
