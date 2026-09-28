import { StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import { AvatarPod } from '@/components/board/AvatarPod';
import { Button } from '@/components/ui/Button';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type JailActionSheetProps = {
  visible: boolean;
  jailTurns: number;
  getOutOfJailFree: number;
  /** Cash ≥ 100 and server allows pay. */
  canPayFine: boolean;
  /** GOOJF ≥ 1 and server allows use. */
  canUseCard: boolean;
  /** Server allows a doubles attempt this turn. */
  canRollDoubles: boolean;
  avatarInitials: string;
  avatarAccent: string;
  payPending?: boolean;
  cardPending?: boolean;
  onPayFine: () => void;
  onUseCard: () => void;
  /** Close modal and unlock dock Roll for a doubles try. */
  onRollDoubles: () => void;
};

function jailHint(opts: {
  attemptsLeft: number;
  canPayFine: boolean;
  canUseCard: boolean;
  canRollDoubles: boolean;
}): string {
  const { attemptsLeft, canPayFine, canUseCard, canRollDoubles } = opts;
  if (canRollDoubles && attemptsLeft > 0) {
    const tryWord = attemptsLeft === 1 ? 'try' : 'tries';
    const parts: string[] = [`Roll doubles (${attemptsLeft} ${tryWord} left)`];
    if (canPayFine) {
      parts.push('pay 100');
    }
    if (canUseCard) {
      parts.push('use a card');
    }
    if (parts.length === 1) {
      return `${parts[0]}.`;
    }
    if (parts.length === 2) {
      return `${parts[0]}, or ${parts[1]}.`;
    }
    return `${parts[0]}, ${parts[1]}, or ${parts[2]}.`;
  }
  if (canPayFine && canUseCard) {
    return 'Pay 100 MeetCoin or use a Get Out of Jail Free card.';
  }
  if (canPayFine) {
    return 'Pay 100 MeetCoin to leave Jail, then Roll to move.';
  }
  if (canUseCard) {
    return 'Use a Get Out of Jail Free card, then Roll to move.';
  }
  return 'You must leave Jail before continuing.';
}

/**
 * Phase 12.4b — centered jail options: avatar + Pay / Roll a Double / Use card.
 * Brand primary buttons; unavailable actions stay visible but disabled.
 * Dock Roll stays off while this is open; "Roll a Double" arms the dock dice.
 */
export function JailActionSheet({
  visible,
  jailTurns,
  getOutOfJailFree,
  canPayFine,
  canUseCard,
  canRollDoubles,
  avatarInitials,
  avatarAccent,
  payPending = false,
  cardPending = false,
  onPayFine,
  onUseCard,
  onRollDoubles,
}: JailActionSheetProps) {
  if (!visible) {
    return null;
  }

  const busy = payPending || cardPending;
  const attemptsLeft = Math.max(0, 3 - jailTurns);
  const payEnabled = canPayFine && !busy;
  const cardEnabled = canUseCard && getOutOfJailFree >= 1 && !busy;
  const doublesEnabled = canRollDoubles && attemptsLeft > 0 && !busy;
  const cardLabel =
    getOutOfJailFree > 0 ? `Use card (${getOutOfJailFree})` : 'Use card';

  return (
    <View style={styles.host} pointerEvents="box-none">
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
                IN JAIL
              </Text>
            </View>
            <Text style={styles.hint}>
              {jailHint({
                attemptsLeft,
                canPayFine,
                canUseCard: getOutOfJailFree >= 1 && canUseCard,
                canRollDoubles: canRollDoubles && attemptsLeft > 0,
              })}
            </Text>
            <View style={styles.body}>
              <AvatarPod
                initials={avatarInitials}
                accent={avatarAccent}
                radius={28}
              />
              <View style={styles.actions}>
                <Button
                  label="Pay 100"
                  onPress={onPayFine}
                  disabled={!payEnabled}
                  loading={payPending}
                />
                <Button
                  label="Roll a Double"
                  onPress={onRollDoubles}
                  disabled={!doublesEnabled}
                />
                <Button
                  label={cardLabel}
                  onPress={onUseCard}
                  disabled={!cardEnabled}
                  loading={cardPending}
                />
              </View>
            </View>
          </View>
        </MotiView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...(StyleSheet.absoluteFill as object),
    zIndex: 44,
    elevation: 44,
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
    maxWidth: 360,
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
  brandHeader: {
    backgroundColor: colors.brand,
  },
  headerText: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    letterSpacing: 1.2,
  },
  brandHeaderText: {
    color: colors.onBrand,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  body: {
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
});
