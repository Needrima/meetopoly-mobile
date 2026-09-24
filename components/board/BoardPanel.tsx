import { Pressable, StyleSheet, Text, View } from 'react-native';

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

type BoardPanelProps = {
  onStick: (stick: StickInput) => void;
  accent?: string;
  initials?: string;
  nearby?: Location | null;
  onEnter?: (loc: Location) => void;
  onDetails?: (loc: Location) => void;
  /** Opens board ⋯ overflow menu (leave / logout / __DEV__). */
  onMenuPress?: () => void;
  /** Phase 6.0+ authoritative game snapshot. */
  game?: Game | null;
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
 * Nearby location + Details / Enter; ⋯ top-right; joystick dock BR.
 */
export function BoardPanel({
  onStick,
  accent,
  initials,
  nearby = null,
  onEnter,
  onDetails,
  onMenuPress,
  game = null,
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
  const blurb =
    nearby?.aboutShort?.trim() ||
    nearby?.description?.trim() ||
    (nearby ? `${nearby.kind} on the board.` : '');

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
    <View style={styles.root}>
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
                    {formatUsername(p.username)}
                    {p.resigned
                      ? ' · out'
                      : isCurrent
                        ? ' · turn'
                        : ''}
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
                    label="End"
                    onPress={onEndTurn}
                    disabled={endDisabled || !canEnd}
                    loading={endPending}
                    style={styles.rollBtn}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {nearby ? (
        <>
          <Text style={styles.title} numberOfLines={2}>
            {nearby.name}
          </Text>
          <Text style={styles.code}>{code}</Text>
          <Text style={styles.body} numberOfLines={3}>
            {blurb}
          </Text>
          <View style={styles.ctaRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (nearby && onDetails) {
                  onDetails(nearby);
                }
              }}
              style={({ pressed }) => [
                styles.detailsBtn,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.detailsLabel}>Details</Text>
            </Pressable>
            <View style={styles.enterWrap}>
              <Button
                label="Enter"
                onPress={() => {
                  if (nearby && onEnter) {
                    onEnter(nearby);
                  }
                }}
                style={styles.enterBtn}
              />
            </View>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.title}>Controls</Text>
          <Text style={styles.body}>
            Walk near a city, air hub, or utility to Enter. Pins move on dice.
          </Text>
        </>
      )}

      <View style={styles.spacer} />

      <View style={styles.footer}>
        <View style={styles.stub}>
          <Text style={styles.stubLabel}>You</Text>
          {initials ? (
            <View style={styles.swatchRow}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: localPin },
                ]}
              >
                <Text
                  style={[
                    styles.swatchText,
                    { color: inkForHex(localPin) },
                  ]}
                >
                  {initials}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
        <Joystick onStick={onStick} size={96} accent={localPin} />
      </View>
    </View>
  );
}

function inkForHex(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) {
    return colors.ink;
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.62 ? colors.ink : colors.onBrand;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 4,
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.brand,
    marginTop: 4,
  },
  code: {
    marginTop: 2,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: colors.ink,
  },
  body: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  ctaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  enterWrap: {
    flex: 1,
  },
  enterBtn: {
    height: 44,
  },
  spacer: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  stub: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    padding: 12,
    gap: 8,
  },
  stubLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.ink,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(20,32,27,0.25)',
  },
  swatchText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.75,
  },
});
