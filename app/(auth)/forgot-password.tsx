import { useRouter } from 'expo-router';

import {
  AuthError,
  AuthField,
  AuthLink,
  AuthPrimaryButton,
  AuthScreen,
} from '@/components/auth/AuthForm';
import { usePasswordResetConfirmForm } from '@/hooks/useAuthForms';

export default function ForgotPasswordConfirmScreen() {
  const router = useRouter();
  const form = usePasswordResetConfirmForm();

  return (
    <AuthScreen
      title="New password"
      subtitle="At least 8 characters, with a letter and a digit."
      bottom={
        <AuthLink label="Go to login" onPress={() => router.replace('/(auth)/login')} />
      }
    >
      <AuthField
        placeholder="New password"
        secureTextEntry
        onChangeText={(value) => form.setFieldValue('password', value)}
      />
      <AuthField
        placeholder="Confirm password"
        secureTextEntry
        onChangeText={(value) => form.setFieldValue('confirm', value)}
      />
      <AuthError message={form.error} />
      <AuthPrimaryButton
        label="Update password"
        loading={form.isSubmitting}
        disabled={!form.canSubmit}
        onPress={form.submit}
      />
    </AuthScreen>
  );
}
