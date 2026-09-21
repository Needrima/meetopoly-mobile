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
import { useSignupVerifyForm } from '@/hooks/useAuthForms';

/** Matches backend default VERIFICATION_CODE_TTL_MINUTES. */
const CODE_TTL_SECONDS = 120;

export default function SignupVerifyScreen() {
  const router = useRouter();
  const form = useSignupVerifyForm();

  return (
    <AuthScreen
      title="Verify email"
      subtitle={
        form.email
          ? `Enter the 6-digit code sent to ${form.email}.`
          : 'Enter the 6-digit code from your email.'
      }
      bottom={
        <CodeResendTimer
          align="center"
          durationSeconds={CODE_TTL_SECONDS}
          onResend={form.resend}
        />
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
        <AuthLink label="Change email" onPress={() => router.replace('/(auth)/email')} />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  changeEmail: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
});
