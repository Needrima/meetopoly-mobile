import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMemo } from 'react';

import type { Location } from '@/api/types';
import type { Game } from '@/api/types';
import { Joystick } from '@/components/board/Joystick';
import { shortTileName } from '@/components/board/tileLabel';
import { Button } from '@/components/ui/Button';
import { AnimatedMeetCoinAmount } from '@/components/ui/AnimatedMeetCoinAmount';
import type { StickInput } from '@/hooks/useBoardWalk';
import { usePlayerTimeBanks } from '@/hooks/useTurnCountdown';
import { formatUsername } from '@/lib/formatUsername';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

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
    return '';
  }
  const known = byHubId.get(id);
  if (known) {
    return known;
  }
  const slug = id.split(':').pop() ?? '';
  return slug.slice(0, 3).toUpperCase() || 'HUB';
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
};

/**
 * Game HUD; Enter (short tile name) above absolute BR joystick.
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
}: BoardPanelProps) {
  const code = nearby ? shortTileName(nearby) : '';
  const enterLabel = code ? `Enter ${code}` : 'Enter';
  const showEnter = Boolean(nearby && onEnter);
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
  const turnName = game?.currentUsername || '—';
  const isMyTurn = Boolean(
    game && localPlayer && game.currentUserId === localPlayer.userId,
  );
  const canRoll = Boolean(isMyTurn && game?.canRoll);
  const canEnd = Boolean(isMyTurn && game?.canEndTurn);
  const bankLabels = usePlayerTimeBanks(game);
  const localBank = localPlayer ? bankLabels[localPlayer.userId] ?? '' : '';
  const localPin = accent ?? localPlayer?.pinColor ?? colors.accent;

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
      style={[
        styles.root,
        { paddingBottom: DOCK_PAD + JOYSTICK_SIZE },
      ]}
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
            {game.status === 'finished'
              ? game.winnerUsername
                ? `${formatUsername(game.winnerUsername)} wins`
                : 'Game over'
              : isMyTurn
                ? 'Your turn'
                : `${formatUsername(turnName)}'s turn`}
          </Text>
          {localPlayer ? (
            <View style={styles.cashRow}>
              <View
                style={[styles.pinDot, { backgroundColor: localPin }]}
              />
              <Text style={styles.cashLabel}>
                You{isMyTurn ? ' · turn' : ''}
              </Text>
              {localBank ? (
                <Text
                  style={[
                    styles.bankLabel,
                    isMyTurn ? styles.bankLabelActive : styles.bankLabelPaused,
                    localBank === '0:00' ? styles.bankLabelExpired : null,
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
              const bank = bankLabels[p.userId] ?? '';
              const isCurrent = p.userId === game.currentUserId && !p.resigned;
              const pinHex = p.pinColor;
              const hubCode = hubBadgeCode(p.hubId, hubCodeById);
              const name = formatUsername(p.username);
              const hubSuffix = hubCode ? `(in ${hubCode})` : '';
              const statusSuffix = p.resigned
                ? ' · out'
                : isCurrent
                  ? ' · turn'
                  : '';
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
                  {bank ? (
                    <Text
                      style={[
                        styles.bankLabel,
                        isCurrent ? styles.bankLabelActive : styles.bankLabelPaused,
                        bank === '0:00' ? styles.bankLabelExpired : null,
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
          {game.status !== 'finished' && (onRoll || onEndTurn) ? (
            <View style={styles.actionRow}>
              {onRoll ? (
                <View style={styles.actionBtn}>
                  <Button
                    label="Roll"
                    onPress={onRoll}
                    disabled={rollDisabled || !canRoll}
                    loading={rollPending}
                    style={styles.rollBtn}
                  />
                </View>
              ) : null}
              {onEndTurn ? (
                <View style={styles.actionBtn}>
                  <Button
                    label="End turn"
                    onPress={onEndTurn}
                    disabled={endDisabled || !canEnd}
                    loading={endPending}
                    style={styles.rollBtn}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
          {showEnter && nearby && onEnter ? (
            <Button
              label={enterLabel}
              onPress={() => {
                onEnter(nearby);
              }}
              style={styles.enterBtn}
            />
          ) : null}
        </View>
      ) : showEnter && nearby && onEnter ? (
        <Button
          label={enterLabel}
          onPress={() => {
            onEnter(nearby);
          }}
          style={[styles.enterBtn, styles.enterBtnSolo]}
        />
      ) : null}

      <View style={styles.joystickDock}>
        <Joystick
          onStick={onStick}
          size={JOYSTICK_SIZE}
          accent={localPin}
        />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  menuBtn: {
    minWidth: 36,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bankLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'right',
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
    textDecorationLine: 'line-through',
    opacity: 0.65,
  },
  rollBtn: {
    height: 40,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
  },
  enterBtn: {
    height: 44,
    marginTop: 8,
  },
  enterBtnSolo: {
    marginTop: 12,
  },
  joystickDock: {
    position: 'absolute',
    right: DOCK_PAD,
    bottom: DOCK_PAD,
  },
  pressed: {
    opacity: 0.75,
  },
});
