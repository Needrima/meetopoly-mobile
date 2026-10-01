import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import { AvatarPod } from '@/components/board/AvatarPod';
import { Button } from '@/components/ui/Button';
import { MeetCoinAmount } from '@/components/ui/MeetCoinAmount';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type DebtOverlayProps = {
  /** Choice sheet: Pay | Bankruptcy (current debtor, no debtPay yet). */
  choiceVisible: boolean;
  /** Compact timer while debt-pay window is open. */
  payingVisible: boolean;
  /** Remaining MeetCoin owed (positive). */
  amountOwed: number;
  owedToLabel: string;
  debtKind?: string;
  avatarInitials: string;
  avatarAccent: string;
  canPay: boolean;
  canBankrupt: boolean;
  /** RFC3339 deadline while paying. */
  payDeadline?: string | null;
  /** Display name of the player raising funds (paying banner). */
  payerUsername?: string;
  /** True when local user is the debtor. */
  isDebtor?: boolean;
  payPending?: boolean;
  bankruptPending?: boolean;
  onPay: () => void;
  onBankrupt: () => void;
};

function formatRemain(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function kindHint(kind: string | undefined): string {
  switch (kind) {
    case 'jail':
      return 'Jail fine';
    case 'tax':
      return 'Tax';
    case 'card':
      return 'Card payment';
    case 'rent':
      return 'Rent';
    default:
      return 'Debt';
  }
}

/**
 * Phase 14.2 — board debt UX.
 * Choice modal is non-dismissible until Pay or Bankruptcy.
 * Paying banner stays non-blocking so sell/mortgage stay usable.
 */
export function DebtOverlay({
  choiceVisible,
  payingVisible,
  amountOwed,
  owedToLabel,
  debtKind,
  avatarInitials,
  avatarAccent,
  canPay,
  canBankrupt,
  payDeadline = null,
  payerUsername = 'Player',
  isDebtor = false,
  payPending = false,
  bankruptPending = false,
  onPay,
  onBankrupt,
}: DebtOverlayProps) {
  const [remainSec, setRemainSec] = useState(0);

  useEffect(() => {
    if (!payingVisible || !payDeadline) {
      setRemainSec(0);
      return;
    }
    const tick = () => {
      const end = Date.parse(payDeadline);
      if (!Number.isFinite(end)) {
        setRemainSec(0);
        return;
      }
      setRemainSec(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [payingVisible, payDeadline]);

  if (!choiceVisible && !payingVisible) {
    return null;
  }

  const busy = payPending || bankruptPending;

  return (
    <View style={styles.host} pointerEvents="box-none">
      {choiceVisible ? (
        <>
          <View style={styles.backdrop} pointerEvents="none" />
          <View style={styles.center} pointerEvents="box-none">
            <MotiView
              from={{ opacity: 0, scale: 0.92, translateY: 12 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 220 }}
              style={styles.sheetWrap}
            >
              <View style={styles.sheet}>
                <View style={[styles.header, styles.brandHeader]}>
                  <Text style={[styles.headerText, styles.brandHeaderText]}>
                    SETTLE DEBT
                  </Text>
                </View>
                <View style={styles.body}>
                  <AvatarPod
                    initials={avatarInitials}
                    accent={avatarAccent}
                    radius={22}
                  />
                  <Text style={styles.hint}>
                    You need to clear your debt to continue. Raise funds for 2
                    minutes, or declare bankruptcy.
                  </Text>
                  <View style={styles.owedBlock}>
                    <Text style={styles.owedLabel}>
                      {kindHint(debtKind)} owed to {owedToLabel}
                    </Text>
                    <MeetCoinAmount
                      amount={amountOwed}
                      size={22}
                      color={colors.danger}
                    />
                  </View>
                  <View style={styles.actions}>
                    <Button
                      label="Pay"
                      compact
                      onPress={onPay}
                      disabled={!canPay || busy}
                      loading={payPending}
                      style={styles.actionBtn}
                    />
                    <Button
                      label="Bankruptcy"
                      variant="danger"
                      compact
                      onPress={onBankrupt}
                      disabled={!canBankrupt || busy}
                      loading={bankruptPending}
                      style={styles.actionBtn}
                    />
                  </View>
                </View>
              </View>
            </MotiView>
          </View>
        </>
      ) : null}

      {payingVisible && !choiceVisible ? (
        <View style={styles.bannerHost} pointerEvents="none">
          <MotiView
            from={{ opacity: 0, translateY: -8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 200 }}
            style={styles.banner}
          >
            <Text style={styles.bannerTitle} numberOfLines={1}>
              {isDebtor
                ? 'Paying debt — sell or mortgage'
                : `${payerUsername} is paying debt`}
            </Text>
            <Text
              style={[
                styles.bannerTimer,
                remainSec <= 30 ? styles.bannerTimerUrgent : null,
              ]}
            >
              {formatRemain(remainSec)}
            </Text>
            <MeetCoinAmount
              amount={amountOwed}
              size={14}
              color={colors.danger}
            />
          </MotiView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...(StyleSheet.absoluteFill as object),
    zIndex: 48,
    elevation: 48,
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
    width: '90%',
    maxWidth: 400,
  },
  sheet: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.brand,
    overflow: 'hidden',
  },
  header: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  headerText: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    letterSpacing: 1.2,
  },
  brandHeader: {
    backgroundColor: colors.brand,
  },
  brandHeaderText: {
    color: colors.onBrand,
  },
  body: {
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
    textAlign: 'center',
  },
  owedBlock: {
    alignItems: 'center',
    gap: 4,
  },
  owedLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    minWidth: 0,
    height: 40,
  },
  bannerHost: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    alignItems: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 420,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.danger,
  },
  bannerTitle: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.ink,
  },
  bannerTimer: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    color: colors.brand,
  },
  bannerTimerUrgent: {
    color: colors.danger,
  },
});
