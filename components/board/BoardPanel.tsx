import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";

import type { Game, GamePlayer, Location } from "@/api/types";
import { BoardDockIcons } from "@/components/board/BoardDockIcons";
import { BoardSeatGrid } from "@/components/board/BoardSeatGrid";
import { EconomyActionBar } from "@/components/board/EconomyActionBar";
import { Joystick } from "@/components/board/Joystick";
import { PlayerInfoModal } from "@/components/board/PlayerInfoModal";
import { shortTileName } from "@/components/board/tileLabel";
import type { PresenceMediaStream } from "@/hooks/useBoardPresence";
import type { StickInput } from "@/hooks/useBoardWalk";
import type { EconomyMode } from "@/lib/economyEligibility";
import { formatUsername } from "@/lib/formatUsername";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

const JOYSTICK_SIZE = 96;
/** Inset from panel edges so the stick thumb stays on-screen. */
const DOCK_PAD = 36;

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

type BoardPanelProps = {
  onStick: (stick: StickInput) => void;
  accent?: string;
  nearby?: Location | null;
  onEnter?: (loc: Location) => void;
  /** Opens board ⋯ overflow menu (leave / logout / __DEV__). */
  onMenuPress?: () => void;
  /** Phase 6.0+ authoritative game snapshot. */
  game?: Game | null;
  /** World locations — resolve hubId → short tile code for in-hub badges. */
  locations?: Location[];
  localUserId?: string | null;
  /** Local username — belt-and-suspenders HUD filter when ids diverge. */
  localUsername?: string | null;
  /** Phase 6.1 — roll when it is your turn. */
  onRoll?: () => void;
  rollDisabled?: boolean;
  rollPending?: boolean;
  /** Phase 6.2 — end turn after non-doubles (or third doubles). */
  onEndTurn?: () => void;
  endDisabled?: boolean;
  endPending?: boolean;
  /** Phase 11.4b economy mode. */
  economyMode?: EconomyMode | null;
  onEconomySelect?: (mode: EconomyMode) => void;
  /** Phase 13.3 — TRADE CTA. */
  tradeEnabled?: boolean;
  onTrade?: () => void;
  /** Phase 13.1 — hold eye to peek under auction. */
  peekActive?: boolean;
  onPeekIn?: () => void;
  onPeekOut?: () => void;
  /** Phase 16.1/16.2 — board camera streams. */
  localVideoStream?: PresenceMediaStream | null;
  remoteVideoByUserId?: Record<string, PresenceMediaStream>;
  localVideoRotationDeg?: number;
  remoteVideoRotationByUserId?: Record<string, number>;
  remoteVideoMutedByUserId?: Record<string, boolean>;
  onFlipCamera?: () => void;
};

/**
 * Game HUD; dock icons [Dice][End][Hub] ··· [Joystick] (11.4a).
 * Phase 16.2 — Meet seat grid replaces text roster; mic lives on local tile.
 */
export function BoardPanel({
  onStick,
  accent,
  nearby = null,
  onEnter,
  onMenuPress,
  game = null,
  locations = [],
  localUserId = null,
  localUsername = null,
  onRoll,
  rollDisabled = false,
  rollPending = false,
  onEndTurn,
  endDisabled = false,
  endPending = false,
  economyMode = null,
  onEconomySelect,
  tradeEnabled = false,
  onTrade,
  peekActive = false,
  onPeekIn,
  onPeekOut,
  localVideoStream = null,
  remoteVideoByUserId = {},
  localVideoRotationDeg = 0,
  remoteVideoRotationByUserId = {},
  remoteVideoMutedByUserId = {},
  onFlipCamera,
}: BoardPanelProps) {
  const code = nearby ? shortTileName(nearby) : "";
  const hubCodeById = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of locations) {
      if (loc.hubId) {
        map.set(loc.hubId, shortTileName(loc));
      }
    }
    return map;
  }, [locations]);
  const localNameKey = formatUsername(localUsername).toLowerCase();
  const localPlayer =
    game?.players.find((p) => localUserId && p.userId === localUserId) ??
    game?.players.find(
      (p) =>
        localNameKey.length > 0 &&
        formatUsername(p.username).toLowerCase() === localNameKey,
    );
  const turnName = game?.currentUsername || "—";
  const isMyTurn = Boolean(
    game && localPlayer && game.currentUserId === localPlayer.userId,
  );
  const canRoll = Boolean(isMyTurn && game?.canRoll);
  const canEnd = Boolean(isMyTurn && game?.canEndTurn);
  const localPin = accent ?? localPlayer?.pinColor ?? colors.accent;
  const rollActive = Boolean(
    onRoll && canRoll && !rollDisabled && !rollPending,
  );
  const endActive = Boolean(onEndTurn && canEnd && !endDisabled && !endPending);
  const hubActive = Boolean(nearby && onEnter);
  const economyEnabled = Boolean(
    game && game.status === "active" && isMyTurn && onEconomySelect,
  );
  const [infoPlayer, setInfoPlayer] = useState<GamePlayer | null>(null);

  return (
    <View
      style={[styles.root, { paddingBottom: DOCK_PAD + JOYSTICK_SIZE + 120 }]}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Panel</Text>
        {onMenuPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Board menu"
            onPress={onMenuPress}
            style={({ pressed }) => [
              styles.menuBtn,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.menuLabel}>⋯</Text>
          </Pressable>
        ) : null}
      </View>

      {game ? (
        <View style={styles.gameHud}>
          <Text style={styles.turnLine} numberOfLines={1}>
            {game.status === "finished"
              ? game.winnerUsername
                ? `${formatUsername(game.winnerUsername)} wins`
                : "Game over"
              : isMyTurn
                ? "Your turn"
                : `${formatUsername(turnName)}'s turn`}
          </Text>
          <BoardSeatGrid
            game={game}
            localUserId={localUserId}
            localUsername={localUsername}
            hubCodeById={hubCodeById}
            localVideoStream={localVideoStream}
            remoteVideoByUserId={remoteVideoByUserId}
            localVideoRotationDeg={localVideoRotationDeg}
            remoteVideoRotationByUserId={remoteVideoRotationByUserId}
            remoteVideoMutedByUserId={remoteVideoMutedByUserId}
            onFlipCamera={() => {
              void onFlipCamera?.();
            }}
            onPlayerInfo={setInfoPlayer}
          />
        </View>
      ) : null}

      <View style={styles.joystickDock}>
        <View style={styles.stickRow}>
          <View style={styles.leftCol}>
            {game?.status === "active" ? (
              <EconomyActionBar
                activeMode={economyMode}
                enabled={economyEnabled}
                tradeEnabled={tradeEnabled}
                onSelect={(mode) => {
                  onEconomySelect?.(mode);
                }}
                onTrade={onTrade}
              />
            ) : null}
            <BoardDockIcons
              rollActive={rollActive}
              endActive={endActive}
              hubActive={hubActive}
              peekActive={peekActive}
              hubCode={code}
              onRoll={onRoll}
              onEndTurn={onEndTurn}
              onEnterHub={() => {
                if (nearby && onEnter) {
                  onEnter(nearby);
                }
              }}
              onPeekIn={onPeekIn}
              onPeekOut={onPeekOut}
            />
          </View>
          <Joystick onStick={onStick} size={JOYSTICK_SIZE} accent={localPin} />
        </View>
      </View>

      <PlayerInfoModal
        visible={Boolean(infoPlayer)}
        player={infoPlayer}
        isLocal={Boolean(
          infoPlayer && localPlayer && infoPlayer.userId === localPlayer.userId,
        )}
        hubCode={
          infoPlayer ? hubBadgeCode(infoPlayer.hubId, hubCodeById) : ""
        }
        onClose={() => setInfoPlayer(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
  },
  menuBtn: {
    minWidth: 36,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  menuLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 18,
    lineHeight: 20,
    color: colors.ink,
    marginTop: -4,
  },
  gameHud: {
    marginTop: 6,
    marginBottom: 4,
    gap: 8,
  },
  turnLine: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.brand,
  },
  joystickDock: {
    position: "absolute",
    left: 0,
    right: DOCK_PAD,
    bottom: DOCK_PAD,
    gap: 10,
  },
  stickRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    width: "100%",
    paddingLeft: 16,
  },
  leftCol: {
    gap: 10,
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.75,
  },
});
