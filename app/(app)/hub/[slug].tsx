import { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveBoardIcon } from '@/components/board/iconRegistry';
import { shortTileName } from '@/components/board/tileLabel';
import { Button } from '@/components/ui/Button';
import { useHubPresence } from '@/hooks/useBoardPresence';
import { useLeaveHub } from '@/hooks/useGame';
import { DEFAULT_WORLD_ID, useLocationBySlug } from '@/hooks/useLocations';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/**
 * Hub placeholder (Phase 8.0–8.2): joins hub presence; blur/Leave clears game hubId
 * then returns to board (board presence reconnects via focus).
 */
export default function HubScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    slug?: string;
    worldId?: string;
    gameId?: string;
  }>();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const worldId =
    typeof params.worldId === 'string' && params.worldId.length > 0
      ? params.worldId
      : DEFAULT_WORLD_ID;
  const gameId =
    typeof params.gameId === 'string' && params.gameId.trim().length > 0
      ? params.gameId.trim()
      : null;

  const { data: location, isLoading, isError, error } = useLocationBySlug(
    worldId,
    slug,
  );

  const hubId = location?.hubId?.trim() || null;
  const presence = useHubPresence(hubId);
  const leaveHubMut = useLeaveHub(gameId);
  const leaveHubRef = useRef(leaveHubMut.mutate);
  leaveHubRef.current = leaveHubMut.mutate;

  // Phase 8.2 — clear hubId on any leave path (button or system back).
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (gameId) {
          leaveHubRef.current(undefined, {
            onError: (err) => {
              console.warn('[hub] leave-hub failed', err);
            },
          });
        }
      };
    }, [gameId]),
  );

  const Icon = resolveBoardIcon(location?.assets?.icon);
  const code = location ? shortTileName(location) : '';

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/board');
    }
  }, []);

  const presenceLabel =
    !hubId
      ? 'No hub id'
      : presence.status === 'connected' && presence.dcOpen
        ? 'Presence connected'
        : presence.status === 'connected'
          ? 'Signaling up…'
          : presence.status === 'connecting'
            ? 'Joining hub…'
            : presence.status === 'error'
              ? 'Presence error'
              : 'Presence idle';

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
        },
      ]}
    >
      <Text style={styles.eyebrow}>Hub</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={styles.spinner} />
      ) : null}

      {isError ? (
        <Text style={styles.error}>
          {error instanceof Error ? error.message : 'Failed to load hub'}
        </Text>
      ) : null}

      {!isLoading && !isError && location ? (
        <View style={styles.card}>
          {Icon ? (
            <View style={styles.iconWrap}>
              <Icon width={56} height={56} color={colors.ink} />
            </View>
          ) : null}
          <Text style={styles.title}>{location.name}</Text>
          <Text style={styles.code}>{code}</Text>
          <Text style={styles.body}>
            {location.aboutShort?.trim() ||
              location.description?.trim() ||
              'Social hub arrives in a later phase. For now this is a local placeholder.'}
          </Text>
          <Text style={styles.meta}>
            {worldId} · {location.hubId}
          </Text>
          <Text style={styles.presence}>{presenceLabel}</Text>
          {location.attribution?.trim() ? (
            <Text style={styles.attribution}>
              {location.attribution.trim()}
            </Text>
          ) : null}
        </View>
      ) : null}

      {!isLoading && !isError && !location && slug ? (
        <Text style={styles.error}>No location for “{slug}”.</Text>
      ) : null}

      <View style={styles.footer}>
        <Button label="Leave" onPress={leave} />
        <Pressable
          accessibilityRole="button"
          onPress={leave}
          style={({ pressed }) => [
            styles.secondary,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.secondaryLabel}>Back to board</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  eyebrow: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 12,
  },
  spinner: {
    marginTop: 24,
  },
  card: {
    flexGrow: 1,
  },
  iconWrap: {
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
    marginBottom: 4,
  },
  code: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginBottom: 12,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
    marginBottom: 16,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginBottom: 6,
  },
  presence: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.brand,
    marginBottom: 12,
  },
  attribution: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginBottom: 8,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.danger,
    marginTop: 16,
  },
  footer: {
    gap: 12,
    marginTop: 'auto' as const,
    paddingTop: 24,
  },
  secondary: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  secondaryLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
  },
});
