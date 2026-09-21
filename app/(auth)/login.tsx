import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  AuthError,
  AuthField,
  AuthLink,
  AuthPrimaryButton,
  AuthScreen,
} from '@/components/auth/AuthForm';
import { useLoginForm } from '@/hooks/useAuthForms';

export default function LoginScreen() {
  const router = useRouter();
  const form = useLoginForm();

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Log in to continue your journey."
      footer={
        <View style={styles.forgotRow}>
          <AuthLink
            label="Forgot password?"
            onPress={() => router.push('/(auth)/forgot')}
          />
        </View>
      }
      bottom={
        <AuthLink
          label="New here? Create an account"
          onPress={() => router.push('/(auth)/email')}
        />
      }
    >
      <AuthField
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={(value) => form.setFieldValue('email', value)}
      />
      <AuthField
        placeholder="Password"
        secureTextEntry
        onChangeText={(value) => form.setFieldValue('password', value)}
      />
      <AuthError message={form.error} />
      <AuthPrimaryButton
        label="Log in"
        loading={form.isSubmitting}
        disabled={!form.canSubmit}
        onPress={form.submit}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
});
