import {
  AuthError,
  AuthField,
  AuthPrimaryButton,
  AuthScreen,
} from '@/components/auth/AuthForm';
import { useSignupPasswordForm } from '@/hooks/useAuthForms';

export default function SignupPasswordScreen() {
  const form = useSignupPasswordForm();

  return (
    <AuthScreen
      title="Create password"
      subtitle="At least 8 characters, with a letter and a digit."
    >
      <AuthField
        placeholder="Password"
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
        label="Continue"
        loading={form.isSubmitting}
        disabled={!form.canSubmit}
        onPress={form.submit}
      />
    </AuthScreen>
  );
}
