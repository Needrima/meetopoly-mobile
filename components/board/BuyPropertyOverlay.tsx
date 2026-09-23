import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import type { GameBuyOffer, Location } from '@/api/types';
import {
  isLightHex,
  kindFallbackLabel,
  rentRowsFor,
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
  buyPending?: boolean;
  onBuy: () => void;
  onDismiss?: () => void;
};

/**
 * Center-board buy modal (Phase 6.4 polish).
 * Stacked deed (color header + rent table) then price / Buy row.
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

  const strip = stripColorFor(location, offer.kind);
  const onStrip = isLightHex(strip) ? colors.ink : colors.onBrand;
  const Icon = resolveBoardIcon(location?.assets?.icon);
  const rows = rentRowsFor(offer.kind, location);

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        onPress={buyPending ? undefined : onDismiss}
        accessibilityLabel="Dismiss buy"
      />
      <View style={styles.center} pointerEvents="box-none">
        <MotiView
          from={{ opacity: 0, scale: 0.94, translateY: 12 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 220 }}
          style={styles.sheetWrap}
        >
          <View style={styles.sheet}>
            <Text style={styles.eyebrow}>Land available</Text>

            <View style={styles.deed}>
              <View style={[styles.deedHeader, { backgroundColor: strip }]}>
                {Icon ? (
                  <View style={styles.deedIconWrap}>
                    <Icon width={26} height={26} color={onStrip} />
                  </View>
                ) : null}
                <Text
                  style={[styles.deedName, { color: onStrip }]}
                  numberOfLines={1}
                >
                  {offer.name}
                </Text>
              </View>

              <View style={styles.deedBody}>
                {rows.length > 0 ? (
                  <View style={styles.rentGrid}>
                    {rows.map((row) => (
                      <View key={row.label} style={styles.rentCell}>
                        <Text style={styles.rentLabel} numberOfLines={1}>
                          {row.label}
                        </Text>
                        <Text style={styles.rentValue}>{row.value}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.kindFallback}>
                    {kindFallbackLabel(offer.kind)}
                  </Text>
                )}
              </View>
            </View>

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
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.brand,
    padding: 12,
    gap: 10,
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.brand,
    textAlign: 'center',
  },
  deed: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  deedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
  },
  deedIconWrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deedName: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    lineHeight: 26,
    includeFontPadding: false,
    textAlignVertical: 'center',
    flexShrink: 1,
  },
  deedBody: {
    backgroundColor: colors.bg,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rentCell: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rentLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    flexShrink: 1,
    marginRight: 6,
  },
  rentValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.ink,
  },
  kindFallback: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 4,
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
  skipHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
  },
});
