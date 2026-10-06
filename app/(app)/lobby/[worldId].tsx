import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LobbyExpiryBanner } from '@/components/lobby/LobbyExpiryBanner';
import { SeatSlot } from '@/components/lobby/SeatSlot';
import { Button } from '@/components/ui/Button';
import { useSession } from '@/hooks/useSession';
import {
  useTableLobby,
  type LobbyMode,
} from '@/hooks/useTableLobby';
import { formatWorldLabel } from '@/lib/worldDisplay';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

function paramOne(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Phase 5.6 + 20.4 + 20.7 — table lobby; countdown from server `expiresAt`.
 */
export default function LobbyScreen() {
  const params = useLocalSearchParams<{
    worldId?: string | string[];
    mode?: string | string[];
    inviteCode?: string | string[];
  }>();
  const worldId = paramOne(params.worldId);
  const modeRaw = paramOne(params.mode);
  const inviteCode = paramOne(params.inviteCode)?.trim() ?? '';

  let mode: LobbyMode = 'public';
  if (modeRaw === 'private') {
    mode = 'private';
  } else if (modeRaw === 'code' || inviteCode) {
    mode = 'code';
  }

  const { user } = useSession();
  const localPlayerId = user?.id ?? '';

  const lobby = useTableLobby({
    worldId: worldId ?? '',
    localPlayerId,
    mode,
    inviteCode,
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
      router.replace('/(app)/play');
    }
  };

  const shareInvite = () => {
    const code = lobby.inviteCode;
    if (!code) {
      return;
    }
    void Share.share({
      message: `Join my Meetopoly lobby with invite code: ${code}`,
    }).catch(() => undefined);
  };

  if (!worldId && mode !== 'code') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.center}>
          <Text style={styles.error}>Missing World</Text>
          <Button label="Back to Play" onPress={leave} />
        </View>
      </SafeAreaView>
    );
  }

  if (mode === 'code' && !inviteCode) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.center}>
          <Text style={styles.error}>Missing invite code</Text>
          <Button label="Back to Play" onPress={leave} />
        </View>
      </SafeAreaView>
    );
  }

  if (lobby.expired && !lobby.joining) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.center}>
          <Text style={styles.error}>Lobby expired</Text>
          <Text style={styles.expiredHint}>
            Lobbies close after 15 minutes if the game hasn’t started. Start a
            new game or join with a fresh invite code.
          </Text>
          <Button label="Back to Play" onPress={leave} />
        </View>
      </SafeAreaView>
    );
  }

  const resolvedWorldId = worldId || lobby.tableId ? worldId : undefined;
  const worldLabel = resolvedWorldId
    ? formatWorldLabel(resolvedWorldId)
    : 'Lobby';
  const subtitleParts = [worldLabel];
  if (lobby.private && lobby.inviteCode) {
    subtitleParts.push(lobby.inviteCode);
  } else if (lobby.tableId) {
    subtitleParts.push(lobby.tableId.slice(0, 6));
  }
  const headerSubtitle = subtitleParts.join(' · ');

  const statusLine = lobby.joining
    ? mode === 'code'
      ? 'Joining with invite…'
      : lobby.private
        ? 'Opening private lobby…'
        : 'Joining matchmaking…'
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
          accessibilityLabel="Leave lobby"
          onPress={leave}
          hitSlop={8}
          style={({ pressed }) => [
            styles.backBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.brand} />
        </Pressable>
        <View style={styles.headerCenter} pointerEvents="none">
          <Text style={styles.title}>Lobby</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {headerSubtitle}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {lobby.error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{lobby.error}</Text>
        </View>
      ) : null}

      {lobby.expiresAt && !lobby.allReady ? (
        <LobbyExpiryBanner expiresAt={lobby.expiresAt} />
      ) : null}

      {lobby.private && lobby.inviteCode && !lobby.joining ? (
        <View style={styles.inviteBanner}>
          <View style={styles.inviteTextCol}>
            <Text style={styles.inviteLabel}>Invite code</Text>
            <Text style={styles.inviteCode} selectable>
              {lobby.inviteCode}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share invite code"
            onPress={shareInvite}
            hitSlop={8}
            style={({ pressed }) => [
              styles.inviteShare,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.inviteShareIconWrap}>
              <Ionicons
                name="share-outline"
                size={20}
                color={colors.brand}
                style={styles.inviteShareIcon}
              />
            </View>
            <Text style={styles.inviteShareLabel}>Share</Text>
          </Pressable>
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
              avatarUrl={seat.avatarUrl}
              isYou={seat.isLocal}
              ready={seat.ready}
              holding={seat.holding}
              holdRemainingSec={lobby.holdRemainingFor(seat.holdEndsAt)}
            />
          ))}
        </View>
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: colors.brand,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
  },
  inviteBanner: {
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inviteTextCol: {
    flex: 1,
    minWidth: 0,
  },
  inviteLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  inviteCode: {
    marginTop: 2,
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    letterSpacing: 2,
    color: colors.ink,
  },
  inviteShare: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 56,
  },
  inviteShareIconWrap: {
    width: 28,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteShareIcon: {
    width: 28,
    textAlign: 'center',
  },
  inviteShareLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.brand,
    textAlign: 'center',
    includeFontPadding: false,
    width: '100%',
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
  expiredHint: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 360,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
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
    opacity: 0.85,
  },
});
