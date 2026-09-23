import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveBoardIcon } from '@/components/board/iconRegistry';
import { shortTileName } from '@/components/board/tileLabel';
import { Button } from '@/components/ui/Button';
import { DEFAULT_WORLD_ID, useLocationBySlug } from '@/hooks/useLocations';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/**
 * Phase 4.6 — hub placeholder (no SFU). Leave returns to board; pose via BoardSession.
 */
export default function HubScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ slug?: string; worldId?: string }>();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const worldId =
    typeof params.worldId === 'string' && params.worldId.length > 0
      ? params.worldId
      : DEFAULT_WORLD_ID;

  const { data: location, isLoading, isError, error } = useLocationBySlug(
    worldId,
    slug,
  );

  const Icon = resolveBoardIcon(location?.assets?.icon);
  const code = location ? shortTileName(location) : '';

  const leave = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/board');
    }
  };

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
      <Text style={styles.eyebrow}>Hub · placeholder</Text>

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
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 12,
  },
  spinner: {
    marginVertical: 24,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 24,
    gap: 8,
  },
  iconWrap: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.brand,
  },
  code: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  body: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  meta: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.danger,
  },
  footer: {
    marginTop: 24,
    gap: 10,
    maxWidth: 360,
  },
  secondary: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
  },
  pressed: {
    opacity: 0.75,
  },
});
