import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import type { GameBuyOffer, Location } from '@/api/types';
import { DeedCard } from '@/components/board/DeedCard';
import { resolveBoardIcon } from '@/components/board/iconRegistry';
import { Button } from '@/components/ui/Button';
import { MeetCoinAmount } from '@/components/ui/MeetCoinAmount';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type BuyPropertyOverlayProps = {
  visible: boolean;
  offer: GameBuyOffer;
  location?: Location | null;
  canAfford: boolean;
  buyPending?: boolean;
  onBuy: () => void;
  onDismiss?: () => void;
};

/**
 * Center-board buy modal (Phase 9.1 branded deed).
 * DeedCard + price / Buy row.
 */
export function BuyPropertyOverlay({
  visible,
  offer,
  location = null,
  canAfford,
  buyPending = false,
  onBuy,
  onDismiss,
}: BuyPropertyOverlayProps) {
  if (!visible) {
    return null;
  }

  const Icon = resolveBoardIcon(location?.assets?.icon);

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        onPress={buyPending ? undefined : onDismiss}
        accessibilityLabel="Dismiss buy"
      />
      <View style={styles.center} pointerEvents="box-none">
        <MotiView
          key={`${offer.boardIndex}:${offer.slug}`}
          from={{ opacity: 0, scale: 0.92, translateY: 16 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 240 }}
          style={styles.sheetWrap}
          pointerEvents="box-none"
        >
          <View style={styles.sheet} pointerEvents="box-none">
            <Text style={styles.eyebrow}>Land available</Text>

            <DeedCard
              name={offer.name}
              kind={offer.kind}
              location={location}
              Icon={Icon}
            />

            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 220, delay: 110 }}
              style={styles.footerAnim}
              pointerEvents="box-none"
            >
              <View style={styles.footer}>
                <View style={styles.priceBlock}>
                  <Text style={styles.priceLabel}>Price</Text>
                  <MeetCoinAmount amount={offer.price} size={20} />
                  {!canAfford ? (
                    <Text style={styles.cannot}>Not enough MeetCoin</Text>
                  ) : null}
                </View>
                <Button
                  label={`Buy · ${offer.price}`}
                  onPress={onBuy}
                  disabled={!canAfford || buyPending}
                  loading={buyPending}
                  style={styles.buyBtn}
                />
              </View>
              <Text style={styles.skipHint}>Or End turn to skip</Text>
            </MotiView>
          </View>
        </MotiView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...(StyleSheet.absoluteFill as object),
    zIndex: 40,
    elevation: 40,
  },
  backdrop: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: colors.overlay,
  },
  center: {
    ...(StyleSheet.absoluteFill as object),
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheetWrap: {
    width: '88%',
    maxWidth: 360,
  },
  sheet: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.brand,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceBlock: {
    flexShrink: 0,
    gap: 2,
    minWidth: 88,
  },
  priceLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  cannot: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.danger,
  },
  buyBtn: {
    flex: 1,
    height: 44,
  },
  footerAnim: {
    gap: 8,
  },
  skipHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
  },
});
