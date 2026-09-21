import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useLoading } from '@/hooks/useLoading';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type CodeResendTimerProps = {
  /** Countdown length in seconds. Defaults to 120 (2 minutes). */
  durationSeconds?: number;
  /** Called when the user taps Resend (after timer hits 0). */
  onResend: () => void | Promise<void>;
  /** Optional label prefix. */
  expiresLabel?: string;
  /** Layout alignment. Defaults to `center` for bottom-docked use. */
  align?: 'left' | 'center';
};

function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Reusable code-expiry countdown + Resend CTA (disabled until timer ends).
 */
export function CodeResendTimer({
  durationSeconds = 120,
  onResend,
  expiresLabel = 'Code expires in',
  align = 'center',
}: CodeResendTimerProps) {
  const [endsAt, setEndsAt] = useState(() => Date.now() + durationSeconds * 1000);
  const [now, setNow] = useState(Date.now());
  const { loading, startLoading, stopLoading } = useLoading();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const canResend = remaining === 0 && !loading;

  const handleResend = useCallback(async () => {
    if (!canResend) {
      return;
    }
    startLoading();
    try {
      await onResend();
      setEndsAt(Date.now() + durationSeconds * 1000);
    } finally {
      stopLoading();
    }
  }, [canResend, durationSeconds, onResend, startLoading, stopLoading]);

  return (
    <View style={[styles.wrap, align === 'center' ? styles.wrapCenter : null]}>
      <Text style={[styles.timer, align === 'center' ? styles.textCenter : null]}>
        {remaining > 0
          ? `${expiresLabel} ${formatMmSs(remaining)}`
          : 'Code expired, you can resend now'}
      </Text>

      <TouchableOpacity
        accessibilityRole="button"
        disabled={!canResend}
        onPress={() => {
          void handleResend();
        }}
        style={[
          styles.resend,
          align === 'center' ? styles.resendCenter : null,
          !canResend ? styles.resendDisabled : null,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.brand} size="small" />
        ) : (
          <Text style={[styles.resendLabel, !canResend ? styles.resendLabelDisabled : null]}>
            Resend code
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
  },
  wrapCenter: {
    alignItems: 'center',
  },
  timer: {
    marginBottom: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  textCenter: {
    textAlign: 'center',
  },
  resend: {
    alignSelf: 'flex-start',
    minHeight: 28,
    justifyContent: 'center',
  },
  resendCenter: {
    alignSelf: 'center',
  },
  resendDisabled: {
    opacity: 0.55,
  },
  resendLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.brand,
  },
  resendLabelDisabled: {
    color: colors.muted,
  },
});
