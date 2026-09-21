import { useRouter } from 'expo-router';

import {
  AuthError,
  AuthField,
  AuthLink,
  AuthPrimaryButton,
  AuthScreen,
} from '@/components/auth/AuthForm';
import { useSignupEmailForm } from '@/hooks/useAuthForms';

export default function SignupEmailScreen() {
  const router = useRouter();
  const form = useSignupEmailForm();

  return (
    <AuthScreen
      title="Create account"
      subtitle="Enter your email. We’ll send a 6-digit verification code."
      bottom={
        <AuthLink label="Go to login" onPress={() => router.replace('/(auth)/login')} />
      }
    >
      <AuthField
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={(value) => form.setFieldValue('email', value)}
      />
      <AuthError message={form.error} />
      <AuthPrimaryButton
        label="Send code"
        loading={form.isSubmitting}
        disabled={!form.canSubmit}
        onPress={form.submit}
      />
    </AuthScreen>
  );
}
