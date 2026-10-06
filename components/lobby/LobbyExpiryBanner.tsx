import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatLobbyCountdown } from '@/hooks/useTableLobby';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type Props = {
  /** Server RFC3339 `expiresAt`. */
  expiresAt: string;
};

/**
 * Phase 20.7 — countdown UI isolated so 1s ticks do not re-render the Ready footer.
 */
export function LobbyExpiryBanner({ expiresAt }: Props) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const expiresMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresMs)) {
    return null;
  }
  const expiresInSec = Math.max(0, Math.ceil((expiresMs - nowMs) / 1000));
  const label = formatLobbyCountdown(expiresInSec);

  return (
    <View style={styles.expiryBanner}>
      <Text style={styles.expiryLabel}>Lobby closes in</Text>
      <Text
        style={[
          styles.expiryValue,
          expiresInSec <= 60 ? styles.expiryUrgent : null,
        ]}
        accessibilityLabel={`Lobby closes in ${label}`}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  expiryBanner: {
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  expiryLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  expiryValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 18,
    letterSpacing: 1,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  expiryUrgent: {
    color: colors.warn,
  },
});
