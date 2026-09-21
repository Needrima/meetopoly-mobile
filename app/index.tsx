import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { resolveSignupResume } from '@/hooks/useAuth';
import { useSession } from '@/hooks/useSession';
import { colors } from '@/theme/colors';

type BootTarget = 'loading' | 'app' | 'login' | 'profile';

export default function IndexScreen() {
  const { token, ready } = useSession();
  const [boot, setBoot] = useState<BootTarget>('loading');

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (token) {
      setBoot('app');
      return;
    }

    let cancelled = false;
    void (async () => {
      const target = await resolveSignupResume();
      if (!cancelled) {
        setBoot(target);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, token]);

  if (!ready || boot === 'loading') {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (boot === 'app') {
    return <Redirect href="/(app)" />;
  }

  if (boot === 'profile') {
    return <Redirect href="/(auth)/profile" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
