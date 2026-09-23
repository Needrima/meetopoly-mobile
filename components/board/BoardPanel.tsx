import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Location } from '@/api/types';
import { Joystick } from '@/components/board/Joystick';
import { shortTileName } from '@/components/board/tileLabel';
import { Button } from '@/components/ui/Button';
import type { StickInput } from '@/hooks/useBoardWalk';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type BoardPanelProps = {
  onStick: (stick: StickInput) => void;
  accent?: string;
  initials?: string;
  nearby?: Location | null;
  onEnter?: (loc: Location) => void;
  onDetails?: (loc: Location) => void;
};

/**
 * Phase 4.6 — nearby location + Details / Enter; joystick dock BR.
 * Details overlay lives on the board screen (full-bleed), not here.
 */
export function BoardPanel({
  onStick,
  accent,
  initials,
  nearby = null,
  onEnter,
  onDetails,
}: BoardPanelProps) {
  const code = nearby ? shortTileName(nearby) : '';
  const blurb =
    nearby?.aboutShort?.trim() ||
    nearby?.description?.trim() ||
    (nearby ? `${nearby.kind} on the board.` : '');

  return (
    <View style={styles.root}>
      <Text style={styles.eyebrow}>Panel</Text>
      {nearby ? (
        <>
          <Text style={styles.title} numberOfLines={2}>
            {nearby.name}
          </Text>
          <Text style={styles.code}>{code}</Text>
          <Text style={styles.body} numberOfLines={3}>
            {blurb}
          </Text>
          <View style={styles.ctaRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (nearby && onDetails) {
                  onDetails(nearby);
                }
              }}
              style={({ pressed }) => [
                styles.detailsBtn,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.detailsLabel}>Details</Text>
            </Pressable>
            <View style={styles.enterWrap}>
              <Button
                label="Enter"
                onPress={() => {
                  if (nearby && onEnter) {
                    onEnter(nearby);
                  }
                }}
                style={styles.enterBtn}
              />
            </View>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.title}>Controls</Text>
          <Text style={styles.body}>
            Walk near a city, air hub, or utility to Enter. Your pin stays on GO.
          </Text>
        </>
      )}

      <View style={styles.spacer} />

      <View style={styles.footer}>
        <View style={styles.stub}>
          <Text style={styles.stubLabel}>Phase 4.6 · Enter</Text>
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
    fontSize: 20,
    color: colors.brand,
    marginTop: 4,
  },
  code: {
    marginTop: 2,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: colors.ink,
  },
  body: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  ctaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  enterWrap: {
    flex: 1,
  },
  enterBtn: {
    height: 44,
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
    fontSize: 12,
  },
  swatchHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  pressed: {
    opacity: 0.75,
  },
});
