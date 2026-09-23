import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Location } from "@/api/types";
import { Board } from "@/components/board/Board";
import { BoardOverflowMenu } from "@/components/board/BoardOverflowMenu";
import { BoardPanel } from "@/components/board/BoardPanel";
import { layoutBoardRing } from "@/components/board/boardLayout";
import { buildGamePins } from "@/components/board/boardPins";
import { shortTileName } from "@/components/board/tileLabel";
import { InfoModal } from "@/components/ui/InfoModal";
import { useLogout, useMe } from "@/hooks/useAuth";
import { useBlockHardwareBack } from "@/hooks/useBlockHardwareBack";
import { useBoardSession } from "@/hooks/useBoardSession";
import { useBoardWalk, type AvatarColorKey } from "@/hooks/useBoardWalk";
import { useGame } from "@/hooks/useGame";
import { DEFAULT_WORLD_ID, useLocations } from "@/hooks/useLocations";
import { useSession } from "@/hooks/useSession";
import { notify } from "@/lib/notify";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

const PANEL_MIN = 168;

/**
 * Board play surface; leave via panel ⋯; avatar pose via Reanimated.
 * Phase 6.0: optional gameId loads MeetCoin HUD + multiplayer pins.
 */
export default function BoardScreen() {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ worldId?: string; gameId?: string }>();
  const worldId =
    typeof params.worldId === "string" && params.worldId.trim().length > 0
      ? params.worldId.trim()
      : DEFAULT_WORLD_ID;
  const gameId =
    typeof params.gameId === "string" && params.gameId.trim().length > 0
      ? params.gameId.trim()
      : null;
  const { token, user } = useSession();
  const me = useMe(Boolean(token));
  const logout = useLogout();
  const { snapshot, saveSnapshot } = useBoardSession();
  const { data, error, isLoading, isError } = useLocations(worldId);
  const gameQuery = useGame(gameId);
  const game = gameQuery.data ?? null;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const startedToastRef = useRef(false);

  useBlockHardwareBack(true);

  useEffect(() => {
    if (!game || startedToastRef.current) {
      return;
    }
    startedToastRef.current = true;
    notify({
      type: "success",
      title: "Game started",
      message: `${game.players.length} players · ${game.currentUsername}'s turn`,
    });
  }, [game]);

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
  const localUserId = me.data?.id ?? user?.id ?? null;
  const restorePoseNorm =
    snapshot?.worldId === worldId && snapshot.hasPose
      ? snapshot.poseNorm
      : null;
  const restoreAccent =
    snapshot?.worldId === worldId && snapshot.accent
      ? { key: snapshot.accentKey, hex: snapshot.accent }
      : null;

  const onAccentReady = useCallback(
    (accent: { key: AvatarColorKey; hex: string }) => {
      if (snapshot?.accent && snapshot.worldId === worldId) {
        return;
      }
      saveSnapshot({
        worldId,
        poseNorm: { x: 0.5, y: 0.5 },
        hasPose: false,
        accent: accent.hex,
        accentKey: accent.key,
        initials: usernameInitialSafe(username),
      });
    },
    [saveSnapshot, snapshot?.accent, snapshot?.worldId, username, worldId],
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

  const gamePins = useMemo(() => {
    if (!layout || !game) {
      return null;
    }
    const pinRadius = Math.max(6, Math.round(layout.size * 0.018));
    return buildGamePins({
      layout,
      players: game.players.map((p) => ({
        userId: p.userId,
        boardIndex: p.boardIndex,
        pinColor: p.pinColor,
      })),
      localUserId,
      pinRadius,
    });
  }, [layout, game, localUserId]);

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
      setMenuOpen(false);
      const pose = walk.getPose();
      saveSnapshot({
        worldId,
        poseNorm: {
          x: pose.x / layout.size,
          y: pose.y / layout.size,
        },
        hasPose: true,
        accent: walk.accent,
        accentKey: walk.accentKey,
        initials: walk.initials,
      });
      router.push({
        pathname: "/(app)/hub/[slug]",
        params: {
          slug: loc.slug,
          worldId,
          ...(gameId ? { gameId } : {}),
        },
      });
    },
    [layout, saveSnapshot, walk, worldId, gameId],
  );

  const leaveBoard = useCallback(() => {
    router.replace("/(app)/worlds");
  }, []);

  const nearby = walk.nearby;
  const nearbyCode = nearby ? shortTileName(nearby) : "";
  const boardPins = gamePins ?? walk.pins;

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
          {isLoading || (gameId && gameQuery.isLoading) ? (
            <View style={styles.boardState}>
              <ActivityIndicator color={colors.onBrand} />
              <Text style={styles.boardStateText}>
                Loading {gameId ? "game" : worldId}…
              </Text>
            </View>
          ) : null}

          {isError || gameQuery.isError ? (
            <View style={styles.boardState}>
              <Text style={styles.boardStateError}>
                {error instanceof Error
                  ? error.message
                  : gameQuery.error instanceof Error
                    ? gameQuery.error.message
                    : "Failed to load board"}
              </Text>
            </View>
          ) : null}

          {!isLoading &&
          !isError &&
          !gameQuery.isError &&
          layout &&
          !(gameId && gameQuery.isLoading) ? (
            <Board
              size={boardSide}
              locations={locations}
              layout={layout}
              highlightedBoardIndex={walk.nearby?.boardIndex ?? null}
              avatar={{
                poseX: walk.poseX,
                poseY: walk.poseY,
                radius: walk.avatarRadius,
                initials: walk.initials,
                accent: walk.accent,
              }}
              pins={boardPins}
            />
          ) : null}
        </View>

        <View style={[styles.panelRail, { height: boardSide }]}>
          <BoardPanel
            onStick={walk.setStick}
            accent={walk.accent}
            initials={walk.initials}
            nearby={walk.nearby}
            onEnter={persistAndEnter}
            onDetails={() => setDetailsOpen(true)}
            onMenuPress={() => setMenuOpen(true)}
            game={game}
            localUserId={localUserId}
          />
        </View>
      </View>

      <InfoModal
        visible={detailsOpen && Boolean(nearby)}
        onClose={() => setDetailsOpen(false)}
        variant="location"
        title={nearby?.name ?? ""}
        subtitle={nearbyCode ? `Board · ${nearbyCode}` : undefined}
        body={
          nearby?.about?.trim() ||
          nearby?.aboutShort?.trim() ||
          nearby?.description?.trim() ||
          undefined
        }
        attribution={nearby?.attribution?.trim() || undefined}
        primaryLabel="Enter"
        onPrimary={
          nearby
            ? () => {
                persistAndEnter(nearby);
              }
            : undefined
        }
      />

      <BoardOverflowMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onLeave={leaveBoard}
        onLogout={() => {
          void logout.mutateAsync();
        }}
        logoutPending={logout.isPending}
        onHealth={
          __DEV__
            ? () => {
                router.push("/(app)/health");
              }
            : undefined
        }
        onLocations={
          __DEV__
            ? () => {
                router.push("/(app)/locations");
              }
            : undefined
        }
      />
    </View>
  );
}

function usernameInitialSafe(username: string | null): string {
  const raw = (username ?? "").trim();
  return raw.length >= 1 ? raw.slice(0, 1).toUpperCase() : "?";
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  main: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
  },
  boardRail: {
    position: "relative",
    flexShrink: 0,
    overflow: "hidden",
    backgroundColor: colors.brandMuted,
  },
  boardState: {
    ...(StyleSheet.absoluteFill as object),
    alignItems: "center",
    justifyContent: "center",
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
    textAlign: "center",
  },
  panelRail: {
    flex: 1,
    minWidth: PANEL_MIN,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
});
