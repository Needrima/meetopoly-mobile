import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";

import type { Location } from "@/api/types";
import type { Game } from "@/api/types";
import { BoardDockIcons } from "@/components/board/BoardDockIcons";
import { EconomyActionBar } from "@/components/board/EconomyActionBar";
import { Joystick } from "@/components/board/Joystick";
import { shortTileName } from "@/components/board/tileLabel";
import { MuteMicButton } from "@/components/voice/MuteMicButton";
import { AnimatedMeetCoinAmount } from "@/components/ui/AnimatedMeetCoinAmount";
import type { StickInput } from "@/hooks/useBoardWalk";
import { usePlayerTimeBanks } from "@/hooks/useTurnCountdown";
import type { EconomyMode } from "@/lib/economyEligibility";
import { formatUsername } from "@/lib/formatUsername";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

const JOYSTICK_SIZE = 96;
/** Inset from panel edges so the stick thumb stays on-screen. */
const DOCK_PAD = 36;

/** Phase 8.2 — short code for roster badge `Name(in LOS)`. */
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
  /** Phase 13.1 — hold eye to peek under auction. */
  peekActive?: boolean;
  onPeekIn?: () => void;
  onPeekOut?: () => void;
};

/**
 * Game HUD; dock icons [Dice][End][Hub] ··· [Joystick] (11.4a).
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
  peekActive = false,
  onPeekIn,
  onPeekOut,
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
  const bankLabels = usePlayerTimeBanks(game);
  const localBank = localPlayer ? (bankLabels[localPlayer.userId] ?? "") : "";
  const localPin = accent ?? localPlayer?.pinColor ?? colors.accent;
  const rollActive = Boolean(
    onRoll && canRoll && !rollDisabled && !rollPending,
  );
  const endActive = Boolean(onEndTurn && canEnd && !endDisabled && !endPending);
  const hubActive = Boolean(nearby && onEnter);
  const economyEnabled = Boolean(
    game && game.status === "active" && isMyTurn && onEconomySelect,
  );

  const otherPlayers = (game?.players ?? []).filter((p) => {
    if (localPlayer && p.userId === localPlayer.userId) {
      return false;
    }
    if (localUserId && p.userId === localUserId) {
      return false;
    }
    if (
      localNameKey &&
      formatUsername(p.username).toLowerCase() === localNameKey
    ) {
      return false;
    }
    return true;
  });

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
          {localPlayer ? (
            <View style={styles.cashRow}>
              <View style={[styles.pinDot, { backgroundColor: localPin }]} />
              <Text style={styles.cashLabel}>
                You{isMyTurn ? " · turn" : ""}
              </Text>
              {typeof localPlayer.country === "string" &&
              localPlayer.country.trim() ? (
                <Text style={styles.countryLabel}>
                  {localPlayer.country.trim().toUpperCase()}
                </Text>
              ) : null}
              {localBank ? (
                <Text
                  style={[
                    styles.bankLabel,
                    isMyTurn ? styles.bankLabelActive : styles.bankLabelPaused,
                    localBank === "0:00" ? styles.bankLabelExpired : null,
                  ]}
                >
                  {localBank}
                </Text>
              ) : null}
              <AnimatedMeetCoinAmount amount={localPlayer.cash} size={15} />
            </View>
          ) : null}
          <View style={styles.balances}>
            {otherPlayers.map((p) => {
              const bank = bankLabels[p.userId] ?? "";
              const isCurrent = p.userId === game.currentUserId && !p.resigned;
              const pinHex = p.pinColor;
              const hubCode = hubBadgeCode(p.hubId, hubCodeById);
              const name = formatUsername(p.username);
              const country =
                typeof p.country === "string" && p.country.trim()
                  ? p.country.trim().toUpperCase()
                  : "";
              const hubSuffix = hubCode ? `(in ${hubCode})` : "";
              const statusSuffix = p.resigned
                ? " · out"
                : isCurrent
                  ? " · turn"
                  : "";
              return (
                <View key={p.userId} style={styles.balanceRow}>
                  <View
                    style={[
                      styles.pinDot,
                      { backgroundColor: pinHex },
                      p.resigned ? styles.pinDotOut : null,
                    ]}
                  />
                  <Text
                    style={[
                      styles.balanceName,
                      p.resigned ? styles.balanceNameOut : null,
                    ]}
                    numberOfLines={1}
                  >
                    {name}
                    {hubSuffix}
                    {statusSuffix}
                  </Text>
                  {country ? (
                    <Text
                      style={[
                        styles.countryLabel,
                        p.resigned ? styles.balanceNameOut : null,
                      ]}
                    >
                      {country}
                    </Text>
                  ) : null}
                  {bank ? (
                    <Text
                      style={[
                        styles.bankLabel,
                        isCurrent
                          ? styles.bankLabelActive
                          : styles.bankLabelPaused,
                        bank === "0:00" ? styles.bankLabelExpired : null,
                      ]}
                    >
                      {bank}
                    </Text>
                  ) : null}
                  <AnimatedMeetCoinAmount
                    amount={p.cash}
                    size={13}
                    color={colors.muted}
                  />
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.joystickDock}>
        <View style={styles.muteRow}>
          <MuteMicButton />
        </View>
        <View style={styles.stickRow}>
          <View style={styles.leftCol}>
            {game?.status === "active" ? (
              <EconomyActionBar
                activeMode={economyMode}
                enabled={economyEnabled}
                onSelect={(mode) => {
                  onEconomySelect?.(mode);
                }}
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
    gap: 6,
  },
  turnLine: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.brand,
  },
  cashRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cashLabel: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.ink,
  },
  balances: {
    gap: 4,
    maxHeight: 96,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bankLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    minWidth: 40,
    textAlign: "right",
  },
  bankLabelActive: {
    color: colors.brand,
  },
  bankLabelPaused: {
    color: colors.muted,
  },
  bankLabelExpired: {
    color: colors.danger,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pinDotOut: {
    opacity: 0.35,
  },
  balanceName: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  balanceNameOut: {
    textDecorationLine: "line-through",
    opacity: 0.65,
  },
  countryLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.muted,
  },
  joystickDock: {
    position: "absolute",
    left: 0,
    right: DOCK_PAD,
    bottom: DOCK_PAD,
    gap: 10,
  },
  muteRow: {
    alignSelf: "flex-end",
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
