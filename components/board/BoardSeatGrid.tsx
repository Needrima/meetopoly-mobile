import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import type { Game, GamePlayer } from "@/api/types";
import { BoardSeatTile } from "@/components/board/BoardSeatTile";
import type { PresenceMediaStream } from "@/hooks/useBoardPresence";
import { usernameInitials } from "@/hooks/useBoardWalk";
import { useMuteMic } from "@/hooks/useMuteMic";
import { useMuteVideo } from "@/hooks/useMuteVideo";
import { boardSeatColumns } from "@/lib/boardSeatLayout";
import { formatUsername } from "@/lib/formatUsername";

type BoardSeatGridProps = {
  game: Game;
  localUserId: string | null;
  localUsername?: string | null;
  hubCodeById: ReadonlyMap<string, string>;
  localVideoStream: PresenceMediaStream | null;
  remoteVideoByUserId: Record<string, PresenceMediaStream>;
  localVideoRotationDeg?: number;
  remoteVideoRotationByUserId?: Record<string, number>;
  /** Publishers who announced cam-off over the presence DataChannel. */
  remoteVideoMutedByUserId?: Record<string, boolean>;
  onFlipCamera: () => void;
  onPlayerInfo: (player: GamePlayer) => void;
  /** Phase 16.3 — current turn player for the depleting seat ring. */
  turnClockUserId?: string | null;
  turnClockRemainingMs?: number;
  turnClockTicking?: boolean;
};

function hubBadgeCode(
  hubId: string | null | undefined,
  byHubId: ReadonlyMap<string, string>,
): string {
  const id = hubId?.trim();
  if (!id) {
    return "";
  }
  const known = byHubId.get(id);
  if (known) {
    return known;
  }
  const slug = id.split(":").pop() ?? "";
  return slug.slice(0, 3).toUpperCase() || "HUB";
}

/**
 * Phase 16.2 — Meet-style player seat grid for the board panel.
 */
export function BoardSeatGrid({
  game,
  localUserId,
  localUsername = null,
  hubCodeById,
  localVideoStream,
  remoteVideoByUserId,
  localVideoRotationDeg = 0,
  remoteVideoRotationByUserId = {},
  remoteVideoMutedByUserId = {},
  onFlipCamera,
  onPlayerInfo,
  turnClockUserId = null,
  turnClockRemainingMs = 0,
  turnClockTicking = false,
}: BoardSeatGridProps) {
  void remoteVideoRotationByUserId; // remotes use frame metadata, not CSS rotate
  const { muted: micMuted, setMuted: setMicMuted } = useMuteMic();
  const { muted: videoMuted, setMuted: setVideoMuted } = useMuteVideo();

  const localNameKey = formatUsername(localUsername).toLowerCase();
  const localPlayer =
    game.players.find((p) => localUserId && p.userId === localUserId) ??
    game.players.find(
      (p) =>
        localNameKey.length > 0 &&
        formatUsername(p.username).toLowerCase() === localNameKey,
    );

  const seats = useMemo(() => {
    return [...game.players].sort((a, b) => a.turnOrder - b.turnOrder);
  }, [game.players]);

  const columns = boardSeatColumns(seats.length);

  const rows: GamePlayer[][] = [];
  for (let i = 0; i < seats.length; i += columns) {
    rows.push(seats.slice(i, i + columns));
  }

  return (
    <View style={styles.root}>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((p) => {
            const isLocal = Boolean(
              localPlayer && p.userId === localPlayer.userId,
            );
            const name = formatUsername(p.username);
            const stream = isLocal
              ? localVideoStream
              : (remoteVideoByUserId[p.userId] ?? null);
            const cameraOff = isLocal
              ? videoMuted || !stream
              : !stream || remoteVideoMutedByUserId[p.userId] === true;
            const contentRotateDeg = isLocal ? localVideoRotationDeg : 0;
            const turnClockActive = Boolean(
              turnClockUserId && p.userId === turnClockUserId,
            );
            return (
              <BoardSeatTile
                key={p.userId}
                displayName={isLocal ? "You" : name}
                pinColor={p.pinColor}
                initials={usernameInitials(name)}
                isLocal={isLocal}
                resigned={p.resigned}
                hubCode={hubBadgeCode(p.hubId, hubCodeById)}
                stream={stream}
                cameraOff={cameraOff}
                mirror={isLocal}
                contentRotateDeg={contentRotateDeg}
                turnClockActive={turnClockActive}
                turnClockTicking={turnClockActive && turnClockTicking}
                turnClockRemainingMs={
                  turnClockActive ? turnClockRemainingMs : 0
                }
                micMuted={micMuted}
                videoMuted={videoMuted}
                onPress={() => onPlayerInfo(p)}
                onToggleMic={isLocal ? () => setMicMuted(!micMuted) : undefined}
                onToggleCamera={
                  isLocal ? () => setVideoMuted(!videoMuted) : undefined
                }
                onFlipCamera={isLocal ? onFlipCamera : undefined}
              />
            );
          })}
          {/* Fill incomplete last row so tiles stay equal width. */}
          {row.length < columns
            ? Array.from({ length: columns - row.length }, (_, i) => (
                <View key={`pad-${i}`} style={styles.pad} />
              ))
            : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 6,
    flexGrow: 0,
  },
  row: {
    flexDirection: "row",
    gap: 6,
    minHeight: 84,
  },
  pad: {
    flex: 1,
  },
});
