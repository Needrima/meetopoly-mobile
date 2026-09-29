import { StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import type { GameBuyOffer, Location } from '@/api/types';
import { DeedCard } from '@/components/board/DeedCard';
import {
  isLightHex,
  stripColorFor,
} from '@/components/board/deedVisual';
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
  /** Phase 13.1 — show Auction CTA (decline list price). */
  canAuction?: boolean;
  buyPending?: boolean;
  auctionPending?: boolean;
  onBuy: () => void;
  onAuction?: () => void;
};

/**
 * Center-board buy modal (Phase 9.1 branded deed).
 * Phase 13.1 — Buy | Auction; non-dismissible until one completes.
 */
export function BuyPropertyOverlay({
  visible,
  offer,
  location = null,
  canAfford,
  canAuction = false,
  buyPending = false,
  auctionPending = false,
  onBuy,
  onAuction,
}: BuyPropertyOverlayProps) {
  if (!visible) {
    return null;
  }

  const Icon = resolveBoardIcon(location?.assets?.icon);
  const strip = stripColorFor(location, offer.kind);
  const onStrip = isLightHex(strip) ? colors.ink : colors.onBrand;
  const busy = buyPending || auctionPending;

  return (
    <View style={styles.host} pointerEvents="box-none">
      <View
        style={styles.backdrop}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
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
          <View
            style={[styles.sheet, { borderColor: strip }]}
            pointerEvents="box-none"
          >
            <View style={[styles.header, { backgroundColor: strip }]}>
              <Text style={[styles.headerText, { color: onStrip }]}>
                Land available
              </Text>
            </View>

            <View style={styles.body}>
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
                <View style={styles.priceBlock}>
                  <Text style={styles.priceLabel}>Price</Text>
                  <MeetCoinAmount amount={offer.price} size={20} />
                  {!canAfford ? (
                    <Text style={styles.cannot}>Not enough MeetCoin</Text>
                  ) : null}
                </View>
                <View style={styles.ctaRow}>
                  <Button
                    label={`Buy · ${offer.price}`}
                    onPress={onBuy}
                    disabled={!canAfford || busy}
                    loading={buyPending}
                    style={styles.ctaBtn}
                  />
                  {canAuction && onAuction ? (
                    <Button
                      label="Auction"
                      variant="outline"
                      onPress={onAuction}
                      disabled={busy}
                      loading={auctionPending}
                      style={styles.ctaBtn}
                    />
                  ) : null}
                </View>
              </MotiView>
            </View>
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
    borderWidth: 2,
    overflow: 'hidden',
  },
  header: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  headerText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  body: {
    padding: 14,
    gap: 12,
  },
  priceBlock: {
    gap: 2,
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
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ctaBtn: {
    flex: 1,
    height: 44,
  },
  footerAnim: {
    gap: 10,
  },
});
