import { useRouter } from 'expo-router';

import {
  AuthError,
  AuthField,
  AuthLink,
  AuthPrimaryButton,
  AuthScreen,
} from '@/components/auth/AuthForm';
import { usePasswordResetEmailForm } from '@/hooks/useAuthForms';

export default function ForgotPasswordEmailScreen() {
  const router = useRouter();
  const form = usePasswordResetEmailForm();

  return (
    <AuthScreen
      title="Forgot password"
      subtitle="Enter the email for your Meetopoly account."
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
