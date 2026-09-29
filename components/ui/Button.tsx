import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
  type StyleProp,
} from 'react-native';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

export type ButtonVariant = 'primary' | 'outline' | 'danger';

export type ButtonProps = {
  /** Visible label when not loading. */
  label: string;
  onPress: () => void;
  /** Dims the button (e.g. form incomplete). Loading also disables. */
  disabled?: boolean;
  /** Shows ActivityIndicator and disables press. */
  loading?: boolean;
  /** `primary` = filled brand; `outline` = brand border; `danger` = filled red. */
  variant?: ButtonVariant;
  /** Tighter padding + slightly smaller label (e.g. side-by-side auction actions). */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Primary Meetopoly button — reusable across auth and later screens.
 * `loading` → spinner; `disabled` / `loading` → dimmed + non-pressable.
 */
export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  compact = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const isOutline = variant === 'outline';
  const isDanger = variant === 'danger';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      activeOpacity={0.85}
      disabled={isDisabled}
      onPress={onPress}
      style={[
        styles.button,
        isDanger
          ? styles.buttonDanger
          : isOutline
            ? styles.buttonOutline
            : styles.buttonPrimary,
        isDisabled ? styles.buttonDisabled : null,
        compact ? styles.buttonCompact : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            isOutline ? colors.brand : colors.onBrand
          }
        />
      ) : (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={[
            styles.label,
            isOutline ? styles.labelOutline : null,
            compact ? styles.labelCompact : null,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 20,
  },
  buttonPrimary: {
    backgroundColor: colors.brand,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.brand,
  },
  buttonDanger: {
    backgroundColor: colors.danger,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonCompact: {
    paddingHorizontal: 10,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.onBrand,
  },
  labelOutline: {
    color: colors.brand,
  },
  labelCompact: {
    fontSize: 14,
  },
});
