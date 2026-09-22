import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/**
 * Phase 4.0 — right-rail panel placeholder.
 * Joystick dock reserved bottom-right (wired in 4.5). Nearby Enter in 4.6.
 */
export function BoardPanel() {
  return (
    <View style={styles.root}>
      <Text style={styles.eyebrow}>Panel</Text>
      <Text style={styles.title}>Controls</Text>
      <Text style={styles.body}>
        Nearby city and Enter will show here. Joystick docks below (4.5). Turn
        actions and video come in later phases.
      </Text>

      <View style={styles.spacer} />

      <View style={styles.footer}>
        <View style={styles.stub}>
          <Text style={styles.stubLabel}>Phase 4.1 · 40-slot ring</Text>
        </View>
        <View style={styles.joystickDock} accessibilityLabel="Joystick placeholder">
          <View style={styles.joystickKnob} />
          <Text style={styles.dockHint}>Stick</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 4,
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    marginTop: 4,
  },
  body: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  spacer: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  stub: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    padding: 12,
  },
  stubLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.ink,
  },
  joystickDock: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joystickKnob: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    opacity: 0.45,
  },
  dockHint: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
  },
});
