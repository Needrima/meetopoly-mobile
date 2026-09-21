import {
  AuthError,
  AuthField,
  AuthPrimaryButton,
  AuthScreen,
} from '@/components/auth/AuthForm';
import { useSignupProfileForm } from '@/hooks/useAuthForms';

export default function SignupProfileScreen() {
  const form = useSignupProfileForm();

  return (
    <AuthScreen
      title="Finish profile"
      subtitle="Pick a username (3–20 chars) and your country code (e.g. NG)."
    >
      <AuthField
        placeholder="Username"
        autoCapitalize="none"
        maxLength={20}
        onChangeText={(value) => form.setFieldValue('username', value)}
      />
      <AuthField
        placeholder="Country (ISO, e.g. NG)"
        autoCapitalize="characters"
        maxLength={2}
        onChangeText={(value) => form.setFieldValue('country', value)}
      />
      <AuthError message={form.error} />
      <AuthPrimaryButton
        label="Enter Meetopoly"
        loading={form.isSubmitting}
        disabled={!form.canSubmit}
        onPress={form.submit}
      />
    </AuthScreen>
  );
}
