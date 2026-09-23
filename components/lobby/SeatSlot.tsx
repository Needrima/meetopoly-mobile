import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

export type SeatSlotProps = {
  /** 1-based seat number for empty-slot label. */
  seatNumber: number;
  /** Display name when occupied; omitted = empty. */
  displayName?: string | null;
  /** Highlight the local player's seat. */
  isYou?: boolean;
  /** Ready badge (unused until 5.4). */
  ready?: boolean;
};

/** One of six lobby seats — presentational only. */
export function SeatSlot({
  seatNumber,
  displayName,
  isYou = false,
  ready = false,
}: SeatSlotProps) {
  const occupied = Boolean(displayName);

  return (
    <View
      accessibilityLabel={
        occupied
          ? `Seat ${seatNumber}, ${displayName}${isYou ? ', you' : ''}${ready ? ', ready' : ''}`
          : `Seat ${seatNumber}, empty`
      }
      style={[
        styles.slot,
        occupied ? styles.slotFilled : styles.slotEmpty,
        isYou ? styles.slotYou : null,
      ]}
    >
      <Text style={styles.seatNum}>Seat {seatNumber}</Text>
      <Text style={styles.name} numberOfLines={1}>
        {occupied ? displayName : 'Open'}
      </Text>
      {isYou ? <Text style={styles.you}>You</Text> : null}
      {occupied && ready ? <Text style={styles.ready}>Ready</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
    minWidth: '30%',
    maxWidth: '32%',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
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
  seatNum: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  name: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
  },
  you: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.accent,
  },
  ready: {
    marginTop: 2,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.success,
  },
});
