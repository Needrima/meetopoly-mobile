import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SeatSlot } from '@/components/lobby/SeatSlot';
import { Button } from '@/components/ui/Button';
import { useLobbyStub } from '@/hooks/useLobbyStub';
import { useWorlds } from '@/hooks/useLocations';
import { useSession } from '@/hooks/useSession';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/**
 * Phase 5.2 — local player seats in the pool; waiting copy until ≥2.
 * Bots / Ready / board start land in 5.3–5.4.
 */
export default function LobbyScreen() {
  const params = useLocalSearchParams<{ worldId?: string | string[] }>();
  const worldId = Array.isArray(params.worldId)
    ? params.worldId[0]
    : params.worldId;

  const { user } = useSession();
  const { data } = useWorlds();
  const world = data?.worlds.find((w) => w.worldId === worldId) ?? null;

  const localPlayerId = user?.id ?? 'local';
  const localDisplayName = user?.username?.trim() || user?.email || 'You';

  const lobby = useLobbyStub({
    worldId: worldId ?? '',
    localPlayerId,
    localDisplayName,
  });

  const leave = () => {
    lobby.leave();
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

  const statusLine = lobby.waitingForPlayers
    ? `Waiting for players… ${lobby.seatedCount}/${lobby.minSeats} needed to continue`
    : `${lobby.seatedCount} seated · Ready comes next`;

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
        <Text style={styles.hint}>{statusLine}</Text>
        <View style={styles.grid}>
          {lobby.seats.map((seat) => (
            <SeatSlot
              key={seat.seatIndex}
              seatNumber={seat.seatIndex + 1}
              displayName={seat.displayName}
              isYou={seat.isLocal}
              ready={seat.ready}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerHint}>
          {lobby.waitingForPlayers
            ? 'Need at least one more player before Ready unlocks'
            : 'Table can Ready when everyone is set'}
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
