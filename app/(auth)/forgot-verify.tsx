import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  AuthError,
  AuthLink,
  AuthPrimaryButton,
  AuthScreen,
} from '@/components/auth/AuthForm';
import { CodeResendTimer } from '@/components/auth/CodeResendTimer';
import { OtpInput } from '@/components/auth/OtpInput';
import { usePasswordResetVerifyForm } from '@/hooks/useAuthForms';

const CODE_TTL_SECONDS = 120;

export default function ForgotPasswordVerifyScreen() {
  const router = useRouter();
  const form = usePasswordResetVerifyForm();

  return (
    <AuthScreen
      title="Check your email"
      subtitle={
        form.email
          ? `Enter the 6-digit code sent to ${form.email}.`
          : 'Enter the 6-digit code from your email.'
      }
      bottom={
        <View style={styles.bottomStack}>
          <CodeResendTimer
            align="center"
            durationSeconds={CODE_TTL_SECONDS}
            onResend={form.resend}
          />
          <AuthLink label="Go to login" onPress={() => router.replace('/(auth)/login')} />
        </View>
      }
    >
      <OtpInput
        length={6}
        value={form.values.code}
        onChange={(code) => form.setFieldValue('code', code)}
        disabled={form.isSubmitting}
      />
      <AuthError message={form.error} />
      <AuthPrimaryButton
        label="Verify"
        loading={form.isSubmitting}
        disabled={!form.canSubmit}
        onPress={form.submit}
      />
      <View style={styles.changeEmail}>
        <AuthLink label="Change email" onPress={() => router.replace('/(auth)/forgot')} />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  changeEmail: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  bottomStack: {
    alignItems: 'center',
    gap: 4,
  },
});
