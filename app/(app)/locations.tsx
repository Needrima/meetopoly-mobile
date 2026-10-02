import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  getCountryName,
  isCountryCode,
  type CountryCode,
} from 'react-native-country-picker-modal';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Location } from '@/api/types';
import { resolveBoardIcon } from '@/components/board/iconRegistry';
import { tileVisual } from '@/components/board/tileStyle';
import { HubTurnSheet } from '@/components/hub/HubTurnSheet';
import { MeetCoinAmount } from '@/components/ui/MeetCoinAmount';
import { useMe } from '@/hooks/useAuth';
import { useGame } from '@/hooks/useGame';
import { DEFAULT_WORLD_ID, useLocations } from '@/hooks/useLocations';
import { useSession } from '@/hooks/useSession';
import { useCurrentTurnClock } from '@/hooks/useTurnCountdown';
import { formatUsername } from '@/lib/formatUsername';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

function cardBackground(loc: Location): string {
  const visual = tileVisual(loc);
  return visual.bandColor ?? visual.fill;
}

function useCountryNameMap(locations: Location[]): Record<string, string> {
  const codesKey = useMemo(() => {
    const set = new Set<string>();
    for (const loc of locations) {
      const code = loc.countryCode?.trim().toUpperCase();
      if (code) {
        set.add(code);
      }
    }
    return [...set].sort().join(',');
  }, [locations]);

  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!codesKey) {
      setMap({});
      return;
    }
    const codes = codesKey.split(',');
    let cancelled = false;
    void Promise.all(
      codes.map(async (code) => {
        if (!isCountryCode(code)) {
          return [code, code] as const;
        }
        try {
          const name = await getCountryName(code as CountryCode);
          return [code, name] as const;
        } catch {
          return [code, code] as const;
        }
      }),
    ).then((entries) => {
      if (!cancelled) {
        setMap(Object.fromEntries(entries));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [codesKey]);

  return map;
}

function LocationCard({
  item,
  countryName,
}: {
  item: Location;
  countryName?: string;
}) {
  const bg = cardBackground(item);
  const Icon = resolveBoardIcon(item.assets?.icon);
  const showPrice = item.kind !== 'special' && item.price > 0;
  const secondary =
    countryName ||
    (item.kind !== 'property'
      ? item.kind.replace(/_/g, ' ')
      : item.specialType?.replace(/_/g, ' ') || '');

  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      {showPrice ? (
        <View style={styles.priceBadge} pointerEvents="none">
          <MeetCoinAmount
            amount={item.price}
            size={11}
            color={colors.onBrand}
          />
        </View>
      ) : null}

      <View style={styles.iconWrap} pointerEvents="none">
        {Icon ? (
          <Icon width={36} height={36} color={colors.onBrand} />
        ) : (
          <Text style={styles.fallbackCode}>{item.boardCode}</Text>
        )}
      </View>

      <View style={styles.nameStack} pointerEvents="none">
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        {secondary ? (
          <Text style={styles.cardCountry} numberOfLines={1}>
            {secondary}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function LocationsScreen() {
  const params = useLocalSearchParams<{ worldId?: string; gameId?: string }>();
  const worldId =
    typeof params.worldId === 'string' && params.worldId.trim().length > 0
      ? params.worldId.trim()
      : DEFAULT_WORLD_ID;
  const gameId =
    typeof params.gameId === 'string' && params.gameId.trim().length > 0
      ? params.gameId.trim()
      : null;

  const { token, user } = useSession();
  const me = useMe(Boolean(token));
  const username = me.data?.username ?? user?.username ?? null;
  const sessionUserId = me.data?.id ?? user?.id ?? null;

  const { data, error, isLoading, isError } = useLocations(worldId);
  const gameQuery = useGame(gameId);
  const game = gameQuery.data ?? null;
  const turnClock = useCurrentTurnClock(game);

  const localUserId = useMemo(() => {
    if (sessionUserId) {
      return sessionUserId;
    }
    if (!game || !username) {
      return null;
    }
    const key = formatUsername(username).toLowerCase();
    return (
      game.players.find(
        (p) => formatUsername(p.username).toLowerCase() === key,
      )?.userId ?? null
    );
  }, [sessionUserId, game, username]);

  const localPlayer = useMemo(
    () => game?.players.find((p) => p.userId === localUserId) ?? null,
    [game?.players, localUserId],
  );

  const isMyTurn = Boolean(
    game &&
      localUserId &&
      game.status === 'active' &&
      game.currentUserId === localUserId &&
      localPlayer &&
      !localPlayer.resigned,
  );

  const bankLabel =
    localUserId && turnClock?.userId === localUserId ? turnClock.label : '';

  const [turnSheetOpen, setTurnSheetOpen] = useState(false);
  const turnEdgeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isMyTurn || !game) {
      return;
    }
    const edge = `${game.currentUserId}:${game.turnStartedAt ?? ''}`;
    if (turnEdgeRef.current === edge) {
      return;
    }
    turnEdgeRef.current = edge;
    setTurnSheetOpen(true);
  }, [isMyTurn, game]);

  useEffect(() => {
    if (!isMyTurn) {
      setTurnSheetOpen(false);
    }
  }, [isMyTurn]);

  const openBoard = useCallback(() => {
    setTurnSheetOpen(false);
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace({
      pathname: '/(app)/board',
      params: {
        worldId,
        ...(gameId ? { gameId } : {}),
      },
    });
  }, [worldId, gameId]);

  const locations = useMemo(
    () => (data?.locations ?? []).filter((loc) => loc.kind !== 'special'),
    [data?.locations],
  );
  const countryByCode = useCountryNameMap(locations);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => {
            router.back();
          }}
          hitSlop={8}
          style={({ pressed }) => [
            styles.backBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.brand} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Locations</Text>
          <Text style={styles.subtitle}>
            {worldId} · {locations.length} spaces
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.muted}>Loading {worldId}…</Text>
        </View>
      ) : null}

      {isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>
            {error instanceof Error
              ? error.message
              : 'Failed to load locations'}
          </Text>
        </View>
      ) : null}

      {!isLoading && !isError ? (
        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {locations.map((item) => {
            const code = item.countryCode?.trim().toUpperCase() ?? '';
            return (
              <View key={item.id} style={styles.cardCell}>
                <LocationCard
                  item={item}
                  countryName={code ? countryByCode[code] : undefined}
                />
              </View>
            );
          })}
        </ScrollView>
      ) : null}

      <HubTurnSheet
        visible={Boolean(turnSheetOpen && isMyTurn && gameId)}
        bankLabel={bankLabel}
        canRoll={false}
        canEnd={false}
        onRoll={() => {}}
        onEndTurn={() => {}}
        onOpenBoard={openBoard}
        onDismiss={() => setTurnSheetOpen(false)}
        dismissLabel="Close"
      />
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
    borderBottomWidth: 1,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  cardCell: {
    width: '25%',
    padding: 4,
  },
  card: {
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  priceBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 2,
    backgroundColor: 'rgba(20, 32, 27, 0.45)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  iconWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackCode: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.onBrand,
  },
  nameStack: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    maxWidth: '78%',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(20, 32, 27, 0.55)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  cardName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.onBrand,
    textAlign: 'right',
  },
  cardCountry: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.onBrand,
    opacity: 0.9,
    textAlign: 'right',
    textTransform: 'capitalize',
  },
});
