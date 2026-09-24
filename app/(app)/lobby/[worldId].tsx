import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SeatSlot } from '@/components/lobby/SeatSlot';
import { Button } from '@/components/ui/Button';
import { useWorlds } from '@/hooks/useLocations';
import { useSession } from '@/hooks/useSession';
import { useTableLobby } from '@/hooks/useTableLobby';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/**
 * Phase 5.6 — real table matchmaking over HTTP + WebSocket.
 */
export default function LobbyScreen() {
  const params = useLocalSearchParams<{ worldId?: string | string[] }>();
  const worldId = Array.isArray(params.worldId)
    ? params.worldId[0]
    : params.worldId;

  const { user } = useSession();
  const { data } = useWorlds();
  const world = data?.worlds.find((w) => w.worldId === worldId) ?? null;

  const localPlayerId = user?.id ?? '';

  const lobby = useTableLobby({
    worldId: worldId ?? '',
    localPlayerId,
  });

  const startedRef = useRef(false);

  useEffect(() => {
    if (!worldId || !lobby.allReady || !lobby.gameId || startedRef.current) {
      return;
    }
    startedRef.current = true;
    router.replace({
      pathname: '/(app)/board',
      params: { worldId, gameId: lobby.gameId },
    });
  }, [lobby.allReady, lobby.gameId, worldId]);

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

  const statusLine = lobby.joining
    ? 'Joining matchmaking…'
    : lobby.localHolding
      ? `Reconnecting… seat held ${lobby.holdRemainingSec}s`
      : lobby.holdingCount > 0
        ? `${lobby.holdingCount} reconnecting · ${lobby.readyCount}/${lobby.seatedCount} ready`
        : lobby.allReady
          ? 'Everyone ready — starting…'
          : lobby.waitingForPlayers
            ? `Waiting for players… ${lobby.seatedCount}/${lobby.minSeats} needed`
            : lobby.isFull
              ? `Table full · ${lobby.readyCount}/${lobby.seatedCount} ready`
              : `${lobby.seatedCount}/${lobby.maxSeats} seated · ${lobby.readyCount} ready`;

  const readyLabel = lobby.localReady ? 'Unready' : 'Ready';

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
            {lobby.tableId ? ` · ${lobby.tableId.slice(0, 6)}` : ''}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            disabled: !lobby.canToggleReady,
            selected: lobby.localReady,
          }}
          disabled={!lobby.canToggleReady}
          onPress={lobby.toggleReady}
          style={({ pressed }) => [
            styles.readyHeaderBtn,
            lobby.localReady ? styles.readyHeaderBtnOn : null,
            !lobby.canToggleReady ? styles.readyDisabled : null,
            pressed && lobby.canToggleReady ? styles.pressed : null,
          ]}
        >
          <Text
            style={[
              styles.readyHeaderLabel,
              lobby.localReady ? styles.readyHeaderLabelOn : null,
            ]}
          >
            {readyLabel}
          </Text>
        </Pressable>
      </View>

      {lobby.error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{lobby.error}</Text>
        </View>
      ) : null}

      {lobby.holdingCount > 0 ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Seat held ~{Math.round(lobby.holdMs / 1000)}s on disconnect · Leave
            frees immediately
          </Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {lobby.joining ? (
          <View style={styles.joiningRow}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.hint}>{statusLine}</Text>
          </View>
        ) : (
          <Text style={styles.hint}>{statusLine}</Text>
        )}
        <View style={styles.grid}>
          {lobby.seats.map((seat) => (
            <SeatSlot
              key={seat.seatIndex}
              seatNumber={seat.seatIndex + 1}
              displayName={seat.displayName}
              pinColor={seat.pinColor}
              isYou={seat.isLocal}
              ready={seat.ready}
              holding={seat.holding}
              holdRemainingSec={lobby.holdRemainingFor(seat.holdEndsAt)}
            />
          ))}
        </View>
        {!lobby.joining && lobby.waitingForPlayers ? (
          <Text style={styles.waitNote}>
            Real matchmaking — another player must join this World to Ready.
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={readyLabel}
          disabled={!lobby.canToggleReady}
          onPress={lobby.toggleReady}
        />
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
    paddingVertical: 8,
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
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: colors.brand,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  readyHeaderBtn: {
    borderRadius: 10,
    backgroundColor: colors.brand,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  readyHeaderBtnOn: {
    backgroundColor: colors.accent,
  },
  readyHeaderLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.onBrand,
  },
  readyHeaderLabelOn: {
    color: colors.onAccent,
  },
  readyDisabled: {
    opacity: 0.45,
  },
  banner: {
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(196, 122, 10, 0.12)',
    borderWidth: 1,
    borderColor: colors.warn,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.warn,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(194, 59, 42, 0.1)',
    borderWidth: 1,
    borderColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorBannerText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.danger,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 10,
  },
  joiningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  waitNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
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
