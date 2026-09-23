import { StyleSheet, Text, View } from 'react-native';

import { Joystick } from '@/components/board/Joystick';
import type { StickInput } from '@/hooks/useBoardWalk';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type BoardPanelProps = {
  onStick: (stick: StickInput) => void;
  accent?: string;
  initials?: string;
};

/**
 * Phase 4.5 — right-rail panel with joystick dock (bottom-right).
 */
export function BoardPanel({ onStick, accent, initials }: BoardPanelProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.eyebrow}>Panel</Text>
      <Text style={styles.title}>Controls</Text>
      <Text style={styles.body}>
        Drag the stick to walk. Your pin stays on GO; your avatar starts in the
        center. Nearby Enter comes in 4.6.
      </Text>

      <View style={styles.spacer} />

      <View style={styles.footer}>
        <View style={styles.stub}>
          <Text style={styles.stubLabel}>Phase 4.5 · walk</Text>
          {initials ? (
            <View style={styles.swatchRow}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: accent ?? colors.accent },
                ]}
              >
                <Text
                  style={[
                    styles.swatchText,
                    { color: inkForHex(accent ?? colors.accent) },
                  ]}
                >
                  {initials}
                </Text>
              </View>
              <Text style={styles.swatchHint}>You</Text>
            </View>
          ) : null}
        </View>
        <Joystick onStick={onStick} size={96} />
      </View>
    </View>
  );
}

function inkForHex(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) {
    return colors.ink;
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.62 ? colors.ink : colors.onBrand;
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
    gap: 8,
  },
  stubLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.ink,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(20,32,27,0.25)',
  },
  swatchText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
  },
  swatchHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
});
