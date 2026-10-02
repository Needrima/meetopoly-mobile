import { StyleSheet, Text, View } from 'react-native';

import type { BoardPresenceStatus } from '@/hooks/useBoardPresence';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type HubMediaRailProps = {
  presenceStatus: BoardPresenceStatus;
  dcOpen: boolean;
  /** Optional time-bank label for the local player (game hubs). */
  bankLabel?: string | null;
};

function presenceLabel(
  status: BoardPresenceStatus,
  dcOpen: boolean,
): string {
  if (status === 'connected' && dcOpen) {
    return 'Live';
  }
  if (status === 'connecting' || status === 'connected') {
    return 'Connecting…';
  }
  if (status === 'error') {
    return 'Hub full or error';
  }
  return '';
}

/**
 * Hub left rail — presence (pose DataChannel) status + optional time bank.
 * Table mic/camera stay on the board SFU; no hub voice UI.
 */
export function HubMediaRail({
  presenceStatus,
  dcOpen,
  bankLabel,
}: HubMediaRailProps) {
  const live = presenceLabel(presenceStatus, dcOpen);

  return (
    <View style={styles.root}>
      <Text style={styles.eyebrow}>Presence</Text>
      {live ? (
        <Text
          style={[
            styles.status,
            presenceStatus === 'error' ? styles.statusError : null,
          ]}
        >
          {live}
        </Text>
      ) : null}

      {bankLabel ? (
        <Text style={styles.bank}>Time · {bankLabel}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  status: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.brand,
  },
  statusError: {
    color: colors.danger,
  },
  bank: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink,
    marginTop: 4,
  },
});
