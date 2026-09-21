import { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as TextInputType,
} from 'react-native';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  /** Number of digits. Defaults to 6. */
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
};

/**
 * Reusable OTP / PIN entry. Digits only; supports paste.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus = true,
  disabled = false,
}: OtpInputProps) {
  const inputRef = useRef<TextInputType>(null);
  const [focused, setFocused] = useState(false);

  const digits = value.replace(/\D/g, '').slice(0, length);
  const cells = Array.from({ length }, (_, i) => digits[i] ?? '');

  const focusInput = () => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.row} onPress={focusInput}>
        {cells.map((digit, index) => {
          const isActive = focused && index === Math.min(digits.length, length - 1);
          return (
            <View
              key={index}
              style={[
                styles.cell,
                isActive ? styles.cellActive : null,
                digit ? styles.cellFilled : null,
              ]}
            >
              <Text style={styles.digit}>{digit}</Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={digits}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus={autoFocus}
        editable={!disabled}
        caretHidden
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hiddenInput}
        accessibilityLabel={`Enter ${length}-digit code`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    flex: 1,
    height: 52,
    maxWidth: 52,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C4BBA8',
    backgroundColor: colors.bg,
  },
  cellActive: {
    borderColor: colors.accent,
    backgroundColor: '#FFFEF9',
  },
  cellFilled: {
    borderColor: colors.brandMuted,
  },
  digit: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 22,
    color: colors.ink,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0.02,
    color: 'transparent',
  },
});
