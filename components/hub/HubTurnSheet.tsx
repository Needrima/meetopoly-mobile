import { MotiView } from 'moti';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type HubTurnSheetProps = {
  visible: boolean;
  bankLabel: string;
  canRoll: boolean;
  canEnd: boolean;
  turnBusy?: boolean;
  rollPending?: boolean;
  endPending?: boolean;
  onRoll: () => void;
  onEndTurn: () => void;
  onOpenBoard: () => void;
  onDismiss: () => void;
};

/**
 * Phase 8.3 — compact turn UI while in a hub (landscape-safe overlay, same family as InfoModal).
 * Actions are 2×2: Roll | End · Open board | Keep walking.
 */
export function HubTurnSheet({
  visible,
  bankLabel,
  canRoll,
  canEnd,
  turnBusy = false,
  rollPending = false,
  endPending = false,
  onRoll,
  onEndTurn,
  onOpenBoard,
  onDismiss,
}: HubTurnSheetProps) {
  if (!visible) {
    return null;
  }

  const busy = turnBusy || rollPending || endPending;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss turn sheet"
        style={styles.scrim}
        onPress={onDismiss}
      />
      <MotiView
        from={{ opacity: 0, translateY: 24 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 220 }}
        style={styles.card}
      >
        <Text style={styles.eyebrow}>Your turn</Text>
        <Text style={styles.title}>Act from the hub</Text>
        {bankLabel ? (
          <Text style={styles.bank}>Time · {bankLabel}</Text>
        ) : null}
        <View style={styles.actions}>
          <View style={styles.row}>
            <View style={styles.half}>
              <Button
                label="Roll"
                onPress={onRoll}
                disabled={!canRoll || busy}
                loading={rollPending}
              />
            </View>
            <View style={styles.half}>
              <Button
                label="End turn"
                onPress={onEndTurn}
                disabled={!canEnd || busy}
                loading={endPending}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <Button label="Open board" onPress={onOpenBoard} />
            </View>
            <View style={styles.half}>
              <Button label="Keep walking" onPress={onDismiss} />
            </View>
          </View>
        </View>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 10,
    marginBottom: 8,
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.brand,
  },
  bank: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 4,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  half: {
    flex: 1,
  },
});
