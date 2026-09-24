import { StyleSheet, Text, View } from 'react-native';

import { formatUsername } from '@/lib/formatUsername';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

export type SeatSlotProps = {
  /** 1-based seat number for empty-slot label. */
  seatNumber: number;
  /** Display name when occupied; omitted = empty. */
  displayName?: string | null;
  /** Unique seat accent from lobby. */
  pinColor?: string | null;
  /** Highlight the local player's seat. */
  isYou?: boolean;
  ready?: boolean;
  /** Disconnect hold — seat reserved briefly. */
  holding?: boolean;
  /** Seconds left on hold (when holding). */
  holdRemainingSec?: number;
};

/** One of six lobby seats — presentational only. */
export function SeatSlot({
  seatNumber,
  displayName,
  pinColor,
  isYou = false,
  ready = false,
  holding = false,
  holdRemainingSec = 0,
}: SeatSlotProps) {
  const label = formatUsername(displayName);
  const occupied = Boolean(label);
  const numColor = occupied ? styles.seatNumFilled : styles.seatNumEmpty;
  const nameColor = occupied ? styles.nameFilled : styles.nameEmpty;

  return (
    <View
      accessibilityLabel={
        occupied
          ? `Seat ${seatNumber}, ${label}${isYou ? ', you' : ''}${
              holding
                ? `, reconnecting ${holdRemainingSec}s`
                : ready
                  ? ', ready'
                  : ''
            }`
          : `Seat ${seatNumber}, empty`
      }
      style={[
        styles.slot,
        occupied ? styles.slotFilled : styles.slotEmpty,
        isYou ? styles.slotYou : null,
        holding ? styles.slotHolding : null,
      ]}
    >
      <View style={styles.nameRow}>
        {occupied && pinColor ? (
          <View style={[styles.pinDot, { backgroundColor: pinColor }]} />
        ) : null}
        <Text style={[styles.seatNum, numColor]}>Seat {seatNumber}</Text>
      </View>
      <Text style={[styles.name, nameColor]} numberOfLines={1}>
        {occupied ? label : 'Open'}
      </Text>
      {isYou && !holding ? <Text style={styles.you}>You</Text> : null}
      {holding ? (
        <Text style={styles.holding}>
          Reconnecting{holdRemainingSec > 0 ? ` · ${holdRemainingSec}s` : '…'}
        </Text>
      ) : occupied && ready ? (
        <View style={styles.readyPill}>
          <Text style={styles.ready}>Ready</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    flexGrow: 1,
    flexBasis: '30%',
    maxWidth: '32%',
    minHeight: 76,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  slotEmpty: {
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
  },
  slotFilled: {
    borderColor: colors.brand,
    backgroundColor: colors.brandMuted,
  },
  slotYou: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  slotHolding: {
    borderColor: colors.warn,
    borderWidth: 2,
    opacity: 0.92,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  seatNum: {
    fontFamily: fonts.body,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  seatNumEmpty: {
    color: colors.muted,
  },
  seatNumFilled: {
    color: 'rgba(255,255,255,0.85)',
  },
  name: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
  },
  nameEmpty: {
    color: colors.muted,
  },
  nameFilled: {
    color: colors.onBrand,
  },
  you: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.accent,
  },
  readyPill: {
    marginTop: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ready: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.brand,
  },
  holding: {
    marginTop: 2,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.onBrand,
    textAlign: 'center',
  },
});
