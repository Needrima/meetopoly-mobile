import { useRouter } from 'expo-router';

import {
  AuthError,
  AuthField,
  AuthLink,
  AuthPrimaryButton,
  AuthScreen,
} from '@/components/auth/AuthForm';
import { CountryField } from '@/components/ui/CountryField';
import { useSignupProfileForm } from '@/hooks/useAuthForms';

export default function SignupProfileScreen() {
  const router = useRouter();
  const form = useSignupProfileForm();

  return (
    <AuthScreen
      title="Finish profile"
      subtitle="Pick a username and your country."
      bottom={
        <AuthLink label="Go to login" onPress={() => router.replace('/(auth)/login')} />
      }
    >
      <AuthField
        placeholder="Username"
        autoCapitalize="none"
        maxLength={20}
        onChangeText={(value) => form.setFieldValue('username', value)}
      />
      <CountryField
        value={form.values.country}
        onChange={(code) => form.setFieldValue('country', code)}
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
