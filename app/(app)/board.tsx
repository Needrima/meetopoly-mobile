import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Location } from '@/api/types';
import { Board } from '@/components/board/Board';
import { BoardPanel } from '@/components/board/BoardPanel';
import { layoutBoardRing } from '@/components/board/boardLayout';
import { shortTileName } from '@/components/board/tileLabel';
import { InfoModal } from '@/components/ui/InfoModal';
import { useMe } from '@/hooks/useAuth';
import { useBoardSession } from '@/hooks/useBoardSession';
import {
  useBoardWalk,
  type AvatarColorKey,
} from '@/hooks/useBoardWalk';
import { DEFAULT_WORLD_ID, useLocations } from '@/hooks/useLocations';
import { useSession } from '@/hooks/useSession';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

const PANEL_MIN = 168;

/**
 * Phase 4.7 — walk near enterable → Details / Enter hub; Leave restores pose.
 * __DEV__: multi-pin fan on GO (soft collide).
 */
export default function BoardScreen() {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { token, user } = useSession();
  const me = useMe(Boolean(token));
  const { snapshot, saveSnapshot } = useBoardSession();
  const { data, error, isLoading, isError } = useLocations(DEFAULT_WORLD_ID);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const availableW = winW - insets.left - insets.right;
  const boardSide = Math.max(0, Math.min(winH, availableW - PANEL_MIN));
  const locations = data?.locations ?? [];

  const layout = useMemo(
    () =>
      boardSide > 0 && locations.length
        ? layoutBoardRing(boardSide, locations)
        : null,
    [boardSide, locations],
  );

  const username = me.data?.username ?? user?.username ?? null;
  const restorePoseNorm =
    snapshot?.worldId === DEFAULT_WORLD_ID && snapshot.hasPose
      ? snapshot.poseNorm
      : null;
  const restoreAccent =
    snapshot?.worldId === DEFAULT_WORLD_ID && snapshot.accent
      ? { key: snapshot.accentKey, hex: snapshot.accent }
      : null;

  const onAccentReady = useCallback(
    (accent: { key: AvatarColorKey; hex: string }) => {
      if (snapshot?.accent) {
        return;
      }
      saveSnapshot({
        worldId: DEFAULT_WORLD_ID,
        poseNorm: { x: 0.5, y: 0.5 },
        hasPose: false,
        accent: accent.hex,
        accentKey: accent.key,
        initials: usernameInitialSafe(username),
      });
    },
    [saveSnapshot, snapshot?.accent, username],
  );

  const walk = useBoardWalk({
    layout,
    locations,
    username,
    enabled: Boolean(layout) && !isLoading && !isError,
    restorePoseNorm,
    restoreAccent,
    onAccentReady,
  });

  useEffect(() => {
    if (!walk.nearby) {
      setDetailsOpen(false);
    }
  }, [walk.nearby]);

  const persistAndEnter = useCallback(
    (loc: Location) => {
      if (!layout) {
        return;
      }
      setDetailsOpen(false);
      saveSnapshot({
        worldId: DEFAULT_WORLD_ID,
        poseNorm: {
          x: walk.pose.x / layout.size,
          y: walk.pose.y / layout.size,
        },
        hasPose: true,
        accent: walk.accent,
        accentKey: walk.accentKey,
        initials: walk.initials,
      });
      router.push({
        pathname: '/(app)/hub/[slug]',
        params: { slug: loc.slug, worldId: DEFAULT_WORLD_ID },
      });
    },
    [
      layout,
      saveSnapshot,
      walk.accent,
      walk.accentKey,
      walk.initials,
      walk.pose.x,
      walk.pose.y,
    ],
  );

  const nearby = walk.nearby;
  const nearbyCode = nearby ? shortTileName(nearby) : '';

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.main,
          { paddingLeft: insets.left, paddingRight: insets.right },
        ]}
      >
        <View
          style={[styles.boardRail, { width: boardSide, height: boardSide }]}
        >
          {isLoading ? (
            <View style={styles.boardState}>
              <ActivityIndicator color={colors.onBrand} />
              <Text style={styles.boardStateText}>
                Loading {DEFAULT_WORLD_ID}…
              </Text>
            </View>
          ) : null}

          {isError ? (
            <View style={styles.boardState}>
              <Text style={styles.boardStateError}>
                {error instanceof Error
                  ? error.message
                  : 'Failed to load locations'}
              </Text>
            </View>
          ) : null}

          {!isLoading && !isError && layout ? (
            <Board
              size={boardSide}
              locations={locations}
              layout={layout}
              highlightedBoardIndex={walk.nearby?.boardIndex ?? null}
              avatar={{
                x: walk.pose.x,
                y: walk.pose.y,
                radius: walk.avatarRadius,
                initials: walk.initials,
                accent: walk.accent,
              }}
              pins={walk.pins}
            />
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(app)');
              }
            }}
            style={({ pressed }) => [
              styles.back,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>
        </View>

        <View style={[styles.panelRail, { height: boardSide }]}>
          <Text style={styles.phase}>
            Phase 4.7 · {locations.length || '…'} slots · {DEFAULT_WORLD_ID}
          </Text>
          <BoardPanel
            onStick={walk.setStick}
            accent={walk.accent}
            initials={walk.initials}
            nearby={walk.nearby}
            onEnter={persistAndEnter}
            onDetails={() => setDetailsOpen(true)}
          />
        </View>
      </View>

      <InfoModal
        visible={detailsOpen && Boolean(nearby)}
        onClose={() => setDetailsOpen(false)}
        variant="location"
        title={nearby?.name ?? ''}
        subtitle={nearbyCode ? `Board · ${nearbyCode}` : undefined}
        body={
          nearby?.about?.trim() ||
          nearby?.aboutShort?.trim() ||
          nearby?.description?.trim() ||
          undefined
        }
        primaryLabel="Enter"
        onPrimary={
          nearby
            ? () => {
                persistAndEnter(nearby);
              }
            : undefined
        }
      />
    </View>
  );
}

function usernameInitialSafe(username: string | null): string {
  const raw = (username ?? '').trim();
  return raw.length >= 1 ? raw.slice(0, 1).toUpperCase() : '?';
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  boardRail: {
    position: 'relative',
    flexShrink: 0,
    overflow: 'hidden',
    backgroundColor: colors.brandMuted,
  },
  boardState: {
    ...(StyleSheet.absoluteFill as object),
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  boardStateText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onBrand,
  },
  boardStateError: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
  back: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 2,
    borderRadius: 10,
    backgroundColor: colors.hud,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.75,
  },
  backLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.onBrand,
  },
  panelRail: {
    flex: 1,
    minWidth: PANEL_MIN,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  phase: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
});
