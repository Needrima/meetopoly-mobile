import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthError, AuthField } from '@/components/auth/AuthForm';
import { Button } from '@/components/ui/Button';
import { useJoinByInviteCode } from '@/hooks/useJoinByInviteCode';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/**
 * Phase 20.5 — join a private lobby by 8-char Crockford invite code.
 */
export default function JoinCodeScreen() {
  const form = useJoinByInviteCode();

  const back = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/play');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={back}
          hitSlop={8}
          style={({ pressed }) => [
            styles.backBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.brand} />
        </Pressable>
        <View style={styles.headerCenter} pointerEvents="none">
          <Text style={styles.title}>Join with code</Text>
          <Text style={styles.subtitle}>Enter an invite from a friend</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.form}>
          <Text style={styles.hint}>
            8 characters — letters and digits.
          </Text>
          <AuthField
            placeholder="Invite code"
            value={form.values.inviteCode}
            onChangeText={form.setInviteCode}
            autoCapitalize="characters"
            maxLength={12}
            keyboardType="default"
          />
          <AuthError message={form.error} />
          <Button
            label="Join lobby"
            onPress={form.submit}
            loading={form.loading}
            disabled={form.values.inviteCode.trim().length === 0}
            style={styles.submit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: -40,
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.brand,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  form: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: 12,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    marginBottom: 4,
    textAlign: 'center',
  },
  submit: {
    marginTop: 4,
  },
  pressed: {
    opacity: 0.8,
  },
});
