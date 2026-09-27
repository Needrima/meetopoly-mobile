import { StyleSheet, Text, View } from 'react-native';

import type { BoardPresenceStatus } from '@/hooks/useBoardPresence';
import { MuteMicButton } from '@/components/voice/MuteMicButton';
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
 * Phase 10.3 — left rail voice chrome: Live status + mute CTA (`muteMic`).
 * Cameras stay deferred; no video UI here.
 */
export function HubMediaRail({
  presenceStatus,
  dcOpen,
  bankLabel,
}: HubMediaRailProps) {
  const live = presenceLabel(presenceStatus, dcOpen);

  return (
    <View style={styles.root}>
      <Text style={styles.eyebrow}>Voice</Text>
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

      <MuteMicButton style={styles.mute} />

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
  mute: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  bank: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink,
    marginTop: 4,
  },
});
