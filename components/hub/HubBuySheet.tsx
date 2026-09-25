import { MotiView } from 'moti';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { GameBuyOffer } from '@/api/types';
import { stripWorldNamePrefix } from '@/components/board/deedVisual';
import { Button } from '@/components/ui/Button';
import { MeetCoinAmount } from '@/components/ui/MeetCoinAmount';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type HubBuySheetProps = {
  visible: boolean;
  offer: GameBuyOffer;
  bankLabel: string;
  canBuy: boolean;
  canEnd: boolean;
  canAfford: boolean;
  buyPending?: boolean;
  endPending?: boolean;
  turnBusy?: boolean;
  onBuy: () => void;
  onEndTurn: () => void;
  onOpenBoard: () => void;
  onDismiss: () => void;
};

/**
 * Phase 8.3 — unowned land while in hub: Buy (or End after buy) + Open board.
 */
export function HubBuySheet({
  visible,
  offer,
  bankLabel,
  canBuy,
  canEnd,
  canAfford,
  buyPending = false,
  endPending = false,
  turnBusy = false,
  onBuy,
  onEndTurn,
  onOpenBoard,
  onDismiss,
}: HubBuySheetProps) {
  if (!visible) {
    return null;
  }

  const showBuy = canBuy;
  const busy = turnBusy || buyPending || endPending;
  const primaryDisabled = showBuy
    ? !canAfford || busy
    : !canEnd || busy;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss buy prompt"
        style={styles.scrim}
        onPress={busy ? undefined : onDismiss}
      />
      <MotiView
        from={{ opacity: 0, translateY: 24 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 220 }}
        style={styles.card}
      >
        <Text style={styles.eyebrow}>Unowned land</Text>
        <Text style={styles.title} numberOfLines={2}>
          {stripWorldNamePrefix(offer.name)}
        </Text>
        {bankLabel ? (
          <Text style={styles.bank}>Time · {bankLabel}</Text>
        ) : null}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>List price</Text>
          <MeetCoinAmount amount={offer.price} size={18} />
        </View>
        {!canAfford && showBuy ? (
          <Text style={styles.cannot}>Not enough MeetCoin</Text>
        ) : null}
        <View style={styles.actions}>
          <View style={styles.row}>
            <View style={styles.half}>
              <Button
                label={showBuy ? 'Buy' : 'End turn'}
                onPress={showBuy ? onBuy : onEndTurn}
                disabled={primaryDisabled}
                loading={showBuy ? buyPending : endPending}
              />
            </View>
            <View style={styles.half}>
              <Button label="Open board" onPress={onOpenBoard} />
            </View>
          </View>
          <Button label="Not now" onPress={onDismiss} disabled={busy} />
        </View>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 90,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 10,
    marginBottom: 8,
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
  bank: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  cannot: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.danger,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  half: {
    flex: 1,
  },
});
