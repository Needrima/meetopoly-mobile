import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

import type { BoardPresenceStatus } from '@/hooks/useBoardPresence';
import { useMuteMic } from '@/hooks/useMuteMic';
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
  const { muted, ready, setMuted } = useMuteMic();
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={muted ? 'Unmute microphone' : 'Mute microphone'}
        accessibilityState={{ disabled: !ready, checked: muted }}
        disabled={!ready}
        hitSlop={8}
        onPress={() => setMuted(!muted)}
        style={({ pressed }) => [
          styles.muteBtn,
          muted ? styles.muteBtnMuted : styles.muteBtnLive,
          pressed ? styles.pressed : null,
          !ready ? styles.muteDisabled : null,
        ]}
      >
        <FontAwesome
          name={muted ? 'microphone-slash' : 'microphone'}
          size={22}
          color={muted ? colors.danger : colors.brand}
        />
      </Pressable>

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
  muteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  /** Mic open — cream fill + brand ring so it reads on white rail. */
  muteBtnLive: {
    borderColor: colors.brand,
    backgroundColor: colors.bg,
  },
  /** Mic muted — cream fill + danger ring; never use white (blends into rail). */
  muteBtnMuted: {
    borderColor: colors.danger,
    backgroundColor: colors.bg,
  },
  muteDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
  bank: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink,
    marginTop: 4,
  },
});
