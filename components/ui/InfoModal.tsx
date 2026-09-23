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
  /** Override default Location / Card eyebrow. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  body?: string;
  /** Optional CC / source credit under the body. */
  attribution?: string;
  /** Optional primary action under the body (e.g. Enter hub). */
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryLoading?: boolean;
  /** When true, primary does not auto-close (caller closes after async work). */
  primaryKeepOpen?: boolean;
  secondaryLabel?: string;
  /** Optional secondary action (defaults to onClose). */
  onSecondary?: () => void;
  secondaryLoading?: boolean;
  /**
   * `stack` (default) — primary above secondary.
   * `row` — outline secondary left, filled primary right (confirm pattern).
   */
  actionsLayout?: 'stack' | 'row';
};

/**
 * Branded info overlay (not RN Modal — landscape + stack nav safe).
 * Mount at a full-screen ancestor so it covers board + panel.
 */
export function InfoModal({
  visible,
  onClose,
  variant = 'location',
  eyebrow,
  title,
  subtitle,
  body,
  attribution,
  primaryLabel,
  onPrimary,
  primaryLoading = false,
  primaryKeepOpen = false,
  secondaryLabel = 'Close',
  onSecondary,
  secondaryLoading = false,
  actionsLayout = 'stack',
}: InfoModalProps) {
  if (!visible) {
    return null;
  }

  const busy = primaryLoading || secondaryLoading;
  const isRow = actionsLayout === 'row';

  const handlePrimary = () => {
    if (!primaryKeepOpen) {
      onClose();
    }
    onPrimary?.();
  };

  const handleSecondary = () => {
    if (onSecondary) {
      onSecondary();
      return;
    }
    onClose();
  };

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        onPress={busy ? undefined : onClose}
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
              {eyebrow ?? (variant === 'card' ? 'Card' : 'Location')}
            </Text>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            {body ? <Text style={styles.body}>{body}</Text> : null}
            {attribution ? (
              <Text style={styles.attribution}>{attribution}</Text>
            ) : null}

            <View style={[styles.actions, isRow ? styles.actionsRow : null]}>
              {isRow ? (
                <>
                  <Button
                    label={secondaryLabel}
                    variant="outline"
                    loading={secondaryLoading}
                    disabled={busy}
                    onPress={handleSecondary}
                    style={styles.actionHalf}
                  />
                  {primaryLabel && onPrimary ? (
                    <Button
                      label={primaryLabel}
                      loading={primaryLoading}
                      disabled={busy}
                      onPress={handlePrimary}
                      style={styles.actionHalf}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  {primaryLabel && onPrimary ? (
                    <Button
                      label={primaryLabel}
                      loading={primaryLoading}
                      disabled={busy}
                      onPress={handlePrimary}
                    />
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={handleSecondary}
                    style={({ pressed }) => [
                      styles.secondary,
                      pressed && !busy ? styles.pressed : null,
                      busy ? styles.secondaryDisabled : null,
                    ]}
                  >
                    <Text style={styles.secondaryLabel}>{secondaryLabel}</Text>
                  </Pressable>
                </>
              )}
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
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionHalf: {
    flex: 1,
    width: undefined,
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
  secondaryDisabled: {
    opacity: 0.45,
  },
});
