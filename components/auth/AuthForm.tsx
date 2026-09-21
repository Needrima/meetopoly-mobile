import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
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

import { AuthHeroArt } from '@/components/auth/AuthHeroArt';
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

export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
  bottom,
  showHeroArt = true,
}: AuthScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.hero,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 20),
            paddingLeft: Math.max(insets.left, 28),
          },
        ]}
      >
        <MotiView
          from={{ opacity: 0, translateX: -12 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          style={styles.heroInner}
        >
          <Text style={styles.brand}>Meetopoly</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {showHeroArt ? <AuthHeroArt /> : null}
        </MotiView>
      </View>

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
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.bg,
  },
  hero: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
  },
  heroInner: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 16,
  },
  brand: {
    marginBottom: 6,
    fontFamily: fonts.displayBold,
    fontSize: 34,
    color: colors.brand,
  },
  title: {
    marginBottom: 8,
    fontFamily: fonts.displaySemiBold,
    fontSize: 22,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    maxWidth: 280,
  },
  formHalf: {
    flex: 1,
    backgroundColor: colors.surface,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
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
