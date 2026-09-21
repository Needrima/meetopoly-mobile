import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthScreenMeta } from '@/components/auth/AuthChrome';
import { Button, type ButtonProps } from '@/components/ui/Button';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type AuthScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Pinned to the bottom center of the form half (e.g. resend timer). */
  bottom?: ReactNode;
  /** Show city + Lottie hero (login / signup entry). Default true. */
  showHeroArt?: boolean;
};

/**
 * Form half of the shared auth chrome. Registers title/subtitle on the left hero.
 */
export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
  bottom,
  showHeroArt = true,
}: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  useAuthScreenMeta({ title, subtitle, showHeroArt });

  return (
    <View
      style={[
        styles.formHalf,
        {
          paddingTop: Math.max(insets.top, 24),
          paddingBottom: Math.max(insets.bottom, 24),
          paddingRight: Math.max(insets.right, 28),
          paddingLeft: 28,
        },
      ]}
    >
      <View style={styles.formInner}>
        <View style={styles.form}>{children}</View>
        {footer ? <View style={styles.footerInline}>{footer}</View> : null}
      </View>
      {bottom ? <View style={styles.bottomDock}>{bottom}</View> : null}
    </View>
  );
}

type AuthFieldProps = {
  placeholder: string;
  onChangeText: (value: string) => void;
  defaultValue?: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  maxLength?: number;
  /** Optional JSX before the text input. */
  prefix?: ReactNode;
  /** Optional JSX after the text input (overrides default password eye when set). */
  suffix?: ReactNode;
};

export function AuthField({
  placeholder,
  onChangeText,
  defaultValue,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  maxLength,
  prefix,
  suffix,
}: AuthFieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const showPasswordToggle = secureTextEntry && suffix === undefined;
  const isSecure = secureTextEntry ? hidden : false;

  const resolvedSuffix =
    suffix !== undefined ? (
      suffix
    ) : showPasswordToggle ? (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
        hitSlop={8}
        onPress={() => setHidden((v) => !v)}
        style={styles.affixHit}
      >
        <Ionicons
          name={hidden ? 'eye-off-outline' : 'eye-outline'}
          size={22}
          color={colors.muted}
        />
      </TouchableOpacity>
    ) : null;

  return (
    <View style={[styles.fieldShell, focused ? styles.fieldShellFocused : null]}>
      {prefix ? <View style={styles.affix}>{prefix}</View> : null}
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        defaultValue={defaultValue}
        onChangeText={onChangeText}
        secureTextEntry={isSecure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.fieldInput}
      />
      {resolvedSuffix ? <View style={styles.affix}>{resolvedSuffix}</View> : null}
    </View>
  );
}

/** Auth primary CTA — shared `Button` with form spacing. */
export function AuthPrimaryButton(props: ButtonProps) {
  return <Button {...props} style={[styles.buttonSpacing, props.style]} />;
}

type AuthLinkProps = {
  label: string;
  onPress: () => void;
};

export function AuthLink({ label, onPress }: AuthLinkProps) {
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.linkPress}>
      <Text style={styles.link}>{label}</Text>
    </TouchableOpacity>
  );
}

export function AuthError({ message }: { message: string | null | undefined }) {
  if (!message) {
    return null;
  }
  return <Text style={styles.error}>{message}</Text>;
}

const styles = StyleSheet.create({
  formHalf: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  formInner: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  form: {
    width: '100%',
  },
  footerInline: {
    marginTop: 12,
  },
  bottomDock: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  fieldShell: {
    width: '100%',
    minHeight: 52,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C4BBA8',
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
  },
  fieldShellFocused: {
    borderColor: colors.accent,
    backgroundColor: '#FFFEF9',
  },
  fieldInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 4,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  affix: {
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  affixHit: {
    padding: 4,
  },
  buttonSpacing: {
    marginTop: 4,
  },
  linkPress: {
    paddingVertical: 8,
  },
  link: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.brand,
  },
  error: {
    marginBottom: 10,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.danger,
  },
});
