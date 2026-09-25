import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import type { Location } from '@/api/types';
import { DeedCard } from '@/components/board/DeedCard';
import { isBuyableKind } from '@/components/board/deedVisual';
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
 * Tap-to-inspect sheet for any board square (Phase 9.1 branded deed).
 * Buyable: DeedCard + Available / Owned by. Specials: icon + label (+ tax).
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
          key={location.boardIndex}
          from={{ opacity: 0, scale: 0.92, translateY: 16 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 240 }}
          style={styles.sheetWrap}
          pointerEvents="box-none"
        >
          <View style={styles.sheet} pointerEvents="box-none">
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
  const price = location.price ?? 0;

  return (
    <>
      <Text style={styles.eyebrow}>Tile info</Text>
      <DeedCard
        name={location.name}
        kind={location.kind}
        location={location}
        Icon={Icon}
      />

      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 220, delay: 110 }}
        pointerEvents="box-none"
      >
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
      </MotiView>
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
    <MotiView
      from={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', duration: 220 }}
      style={styles.specialBody}
    >
      {Icon ? <Icon width={56} height={56} color={colors.brand} /> : null}
      <Text style={styles.specialTitle}>{title}</Text>
      {tax != null ? (
        <View style={styles.taxRow}>
          <Text style={styles.taxLabel}>Pay</Text>
          <MeetCoinAmount amount={tax} size={20} />
        </View>
      ) : null}
    </MotiView>
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
