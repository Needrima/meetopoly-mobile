import { Stack } from 'expo-router';

import { AuthChrome } from '@/components/auth/AuthChrome';
import { colors } from '@/theme/colors';

export default function AuthLayout() {
  return (
    <AuthChrome>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.surface, flex: 1 },
          animation: 'slide_from_right',
          animationDuration: 300,
          animationTypeForReplace: 'pop',
        }}
      />
    </AuthChrome>
  );
}
