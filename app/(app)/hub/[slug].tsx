import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Joystick } from '@/components/board/Joystick';
import { shortTileName } from '@/components/board/tileLabel';
import { HubScene } from '@/components/hub/HubScene';
import { Button } from '@/components/ui/Button';
import { useMe } from '@/hooks/useAuth';
import { useHubPresence } from '@/hooks/useBoardPresence';
import { useGame, useLeaveHub } from '@/hooks/useGame';
import { useHubWalk } from '@/hooks/useHubWalk';
import { DEFAULT_WORLD_ID, useLocationBySlug } from '@/hooks/useLocations';
import { useSession } from '@/hooks/useSession';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

const JOYSTICK_SIZE = 96;
const DOCK_PAD = 20;
const HEADER_H = 52;

/**
 * Phase 8.1 hub: presence poses on a walkable surface + remotes; Leave clears hubId.
 */
export default function HubScreen() {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
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

  const { token, user } = useSession();
  const me = useMe(Boolean(token));
  const username = me.data?.username ?? user?.username ?? null;

  const { data: location, isLoading, isError, error } = useLocationBySlug(
    worldId,
    slug,
  );

  const hubId = location?.hubId?.trim() || null;
  const presence = useHubPresence(hubId);
  const leaveHubMut = useLeaveHub(gameId);
  const leaveHubRef = useRef(leaveHubMut.mutate);
  leaveHubRef.current = leaveHubMut.mutate;
  const gameQuery = useGame(gameId);
  const game = gameQuery.data ?? null;

  const [surfaceBox, setSurfaceBox] = useState({ w: 0, h: 0 });
  const surfaceSize = Math.max(
    0,
    Math.floor(Math.min(surfaceBox.w, surfaceBox.h)),
  );

  const walk = useHubWalk({
    size: surfaceSize,
    username,
    enabled: surfaceSize > 0,
  });

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

  const getPoseRef = useRef(walk.getPose);
  getPoseRef.current = walk.getPose;
  const sendPoseRef = useRef(presence.sendPose);
  sendPoseRef.current = presence.sendPose;

  useEffect(() => {
    if (!presence.dcOpen || surfaceSize <= 0) {
      return;
    }
    const tick = () => {
      const pose = getPoseRef.current();
      sendPoseRef.current({
        x: pose.x / surfaceSize,
        y: pose.y / surfaceSize,
      });
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [presence.dcOpen, surfaceSize]);

  const remotes = useMemo(() => {
    const colorByUser = new Map<string, string>();
    for (const p of game?.players ?? []) {
      if (p.pinColor) {
        colorByUser.set(p.userId, p.pinColor);
      }
    }
    return Object.values(presence.remotes).map((pose) => ({
      pose,
      accent: colorByUser.get(pose.userId) ?? colors.muted,
    }));
  }, [presence.remotes, game?.players]);

  const code = location ? shortTileName(location) : '';

  const onSurfaceLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSurfaceBox((prev) =>
      prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  };

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/board');
    }
  }, []);

  const presenceHint =
    presence.status === 'connected' && presence.dcOpen
      ? 'Live'
      : presence.status === 'connecting' || presence.status === 'connected'
        ? 'Connecting…'
        : '';

  const maxScene = Math.min(winW - insets.left - insets.right - 32, winH * 0.62);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
          paddingLeft: insets.left + 16,
          paddingRight: insets.right + 16,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Hub{code ? ` · ${code}` : ''}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {location?.name ?? (isLoading ? '…' : slug || 'Hub')}
          </Text>
          {presenceHint ? (
            <Text style={styles.presence}>{presenceHint}</Text>
          ) : null}
        </View>
        <Button label="Leave" onPress={leave} />
      </View>

      {isError ? (
        <Text style={styles.error}>
          {error instanceof Error ? error.message : 'Failed to load hub'}
        </Text>
      ) : null}

      {isLoading && !location ? (
        <ActivityIndicator color={colors.brand} style={styles.spinner} />
      ) : null}

      <View style={[styles.stage, { maxHeight: maxScene }]} onLayout={onSurfaceLayout}>
        <View style={styles.stageInner}>
          {surfaceSize > 0 ? (
            <HubScene
              size={surfaceSize}
              local={{
                poseX: walk.poseX,
                poseY: walk.poseY,
                radius: walk.avatarRadius,
                initials: walk.initials,
                accent: walk.accent,
              }}
              remotes={remotes}
              remoteRadius={walk.avatarRadius}
            />
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.stickDock,
          { right: DOCK_PAD, bottom: DOCK_PAD + insets.bottom },
        ]}
        pointerEvents="box-none"
      >
        <Joystick
          onStick={walk.setStick}
          size={JOYSTICK_SIZE}
          accent={walk.accent}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    minHeight: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.brand,
  },
  presence: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.brand,
    marginTop: 2,
  },
  spinner: {
    marginTop: 12,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.danger,
    marginBottom: 8,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  stageInner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickDock: {
    position: 'absolute',
    zIndex: 30,
  },
});
