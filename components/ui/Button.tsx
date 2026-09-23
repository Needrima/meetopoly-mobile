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

export type ButtonVariant = 'primary' | 'outline';

export type ButtonProps = {
  /** Visible label when not loading. */
  label: string;
  onPress: () => void;
  /** Dims the button (e.g. form incomplete). Loading also disables. */
  disabled?: boolean;
  /** Shows ActivityIndicator and disables press. */
  loading?: boolean;
  /** `primary` = filled brand; `outline` = brand border + brand text. */
  variant?: ButtonVariant;
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
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      activeOpacity={0.85}
      disabled={isDisabled}
      onPress={onPress}
      style={[
        styles.button,
        isOutline ? styles.buttonOutline : styles.buttonPrimary,
        isDisabled ? styles.buttonDisabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isOutline ? colors.brand : colors.onBrand}
        />
      ) : (
        <Text
          style={[styles.label, isOutline ? styles.labelOutline : null]}
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
  buttonDisabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.onBrand,
  },
  labelOutline: {
    color: colors.brand,
  },
});
