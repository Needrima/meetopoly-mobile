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

export type ButtonProps = {
  /** Visible label when not loading. */
  label: string;
  onPress: () => void;
  /** Dims the button (e.g. form incomplete). Loading also disables. */
  disabled?: boolean;
  /** Shows ActivityIndicator and disables press. */
  loading?: boolean;
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
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      activeOpacity={0.85}
      disabled={isDisabled}
      onPress={onPress}
      style={[styles.button, isDisabled ? styles.buttonDisabled : null, style]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onBrand} />
      ) : (
        <Text style={styles.label}>{label}</Text>
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
    backgroundColor: colors.brand,
    paddingHorizontal: 20,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.onBrand,
  },
});
