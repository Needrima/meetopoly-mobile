import { MotiView } from 'moti';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

export type InfoModalVariant = 'location' | 'card';

export type InfoModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Extensible content kind — location now; chance/chest cards later. */
  variant?: InfoModalVariant;
  title: string;
  subtitle?: string;
  body?: string;
  /** Optional CC / source credit under the body. */
  attribution?: string;
  /** Optional primary action under the body (e.g. Enter hub). */
  primaryLabel?: string;
  onPrimary?: () => void;
};

/**
 * Branded info overlay (not RN Modal — landscape + stack nav safe).
 * Mount at a full-screen ancestor so it covers board + panel.
 */
export function InfoModal({
  visible,
  onClose,
  variant = 'location',
  title,
  subtitle,
  body,
  attribution,
  primaryLabel,
  onPrimary,
}: InfoModalProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Dismiss"
      />
      <View style={styles.center} pointerEvents="box-none">
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 220 }}
          style={styles.sheetWrap}
        >
          <View style={styles.sheet}>
            <Text style={styles.eyebrow}>
              {variant === 'card' ? 'Card' : 'Location'}
            </Text>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            {body ? <Text style={styles.body}>{body}</Text> : null}
            {attribution ? (
              <Text style={styles.attribution}>{attribution}</Text>
            ) : null}

            <View style={styles.actions}>
              {primaryLabel && onPrimary ? (
                <Button
                  label={primaryLabel}
                  onPress={() => {
                    onClose();
                    onPrimary();
                  }}
                />
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.secondary,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.secondaryLabel}>Close</Text>
              </Pressable>
            </View>
          </View>
        </MotiView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    elevation: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheetWrap: {
    width: '100%',
    maxWidth: 420,
  },
  sheet: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 8,
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
    fontSize: 24,
    color: colors.brand,
  },
  subtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  body: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  attribution: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    fontStyle: 'italic',
  },
  actions: {
    marginTop: 16,
    gap: 10,
  },
  secondary: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  secondaryLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
  },
  pressed: {
    opacity: 0.75,
  },
});
