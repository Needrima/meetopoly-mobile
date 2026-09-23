import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import type { Location } from '@/api/types';
import {
  isBuyableKind,
  isLightHex,
  kindFallbackLabel,
  rentRowsFor,
  stripColorFor,
} from '@/components/board/deedVisual';
import { resolveBoardIcon } from '@/components/board/iconRegistry';
import { MeetCoinAmount } from '@/components/ui/MeetCoinAmount';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

export type TileOwnerInfo = {
  username: string;
  pinColor: string;
};

type TileInfoOverlayProps = {
  visible: boolean;
  location: Location | null;
  /** Present when a deed exists for this boardIndex. */
  owner?: TileOwnerInfo | null;
  onClose: () => void;
};

function specialTitle(loc: Location): string {
  switch (loc.specialType) {
    case 'chance':
      return 'Chance';
    case 'community_chest':
      return 'Community Chest';
    case 'go':
      return 'GO';
    case 'jail':
      return 'Jail';
    case 'go_to_jail':
      return 'Go to Jail';
    case 'free_parking':
      return loc.name?.trim() || 'Layover';
    case 'tax':
      return loc.name?.trim() || 'Tax';
    default:
      return loc.name?.trim() || 'Space';
  }
}

/**
 * Tap-to-inspect sheet for any board square (Phase 6.4 polish).
 * Buyable: deed card + Available / Owned by. Specials: icon + label (+ tax amount).
 */
export function TileInfoOverlay({
  visible,
  location,
  owner = null,
  onClose,
}: TileInfoOverlayProps) {
  if (!visible || !location) {
    return null;
  }

  const buyable = isBuyableKind(location.kind);
  const Icon = resolveBoardIcon(location.assets?.icon);

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Dismiss tile info"
      />
      <View style={styles.center} pointerEvents="box-none">
        <MotiView
          from={{ opacity: 0, scale: 0.94, translateY: 12 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 220 }}
          style={styles.sheetWrap}
        >
          <View style={styles.sheet}>
            {buyable ? (
              <BuyableBody location={location} owner={owner} Icon={Icon} />
            ) : (
              <SpecialBody location={location} Icon={Icon} />
            )}
          </View>
        </MotiView>
      </View>
    </View>
  );
}

function BuyableBody({
  location,
  owner,
  Icon,
}: {
  location: Location;
  owner: TileOwnerInfo | null;
  Icon: ReturnType<typeof resolveBoardIcon>;
}) {
  const strip = stripColorFor(location, location.kind);
  const onStrip = isLightHex(strip) ? colors.ink : colors.onBrand;
  const rows = rentRowsFor(location.kind, location);
  const price = location.price ?? 0;

  return (
    <>
      <Text style={styles.eyebrow}>Tile info</Text>
      <View style={styles.deed}>
        <View style={[styles.deedHeader, { backgroundColor: strip }]}>
          {Icon ? (
            <View style={styles.deedIconWrap}>
              <Icon width={26} height={26} color={onStrip} />
            </View>
          ) : null}
          <Text style={[styles.deedName, { color: onStrip }]} numberOfLines={1}>
            {location.name}
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
              {kindFallbackLabel(location.kind)}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.priceBlock}>
          <Text style={styles.priceLabel}>Price</Text>
          <MeetCoinAmount amount={price} size={18} />
        </View>
        {owner ? (
          <View style={styles.ownerBlock}>
            <Text style={styles.priceLabel}>Owned by</Text>
            <View style={styles.ownerRow}>
              <View
                style={[styles.ownerDot, { backgroundColor: owner.pinColor }]}
              />
              <Text style={styles.ownerName} numberOfLines={1}>
                {owner.username}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.ownerBlock}>
            <Text style={styles.priceLabel}>Status</Text>
            <Text style={styles.available}>Available</Text>
          </View>
        )}
      </View>
    </>
  );
}

function SpecialBody({
  location,
  Icon,
}: {
  location: Location;
  Icon: ReturnType<typeof resolveBoardIcon>;
}) {
  const title = specialTitle(location);
  const tax =
    location.specialType === 'tax' && typeof location.taxAmount === 'number'
      ? location.taxAmount
      : null;

  return (
    <View style={styles.specialBody}>
      {Icon ? <Icon width={56} height={56} color={colors.ink} /> : null}
      <Text style={styles.specialTitle}>{title}</Text>
      {tax != null ? (
        <View style={styles.taxRow}>
          <Text style={styles.taxLabel}>Pay</Text>
          <MeetCoinAmount amount={tax} size={20} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...(StyleSheet.absoluteFill as object),
    zIndex: 35,
    elevation: 35,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  priceBlock: {
    flex: 1,
    gap: 2,
  },
  ownerBlock: {
    flex: 1,
    gap: 2,
  },
  priceLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(20,32,27,0.25)',
  },
  ownerName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
    flexShrink: 1,
  },
  available: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.success,
  },
  specialBody: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  specialTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.ink,
    textAlign: 'center',
  },
  taxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  taxLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.muted,
  },
});
