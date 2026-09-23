import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { useLogout } from '@/hooks/useAuth';
import { useSession } from '@/hooks/useSession';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/**
 * Phase 4.8 — signed-in menu home (not the board).
 * Play → board; Settings / About stubs; Log out.
 */
export default function HomeMenuScreen() {
  const { user } = useSession();
  const logout = useLogout();
  const who = user?.username ?? user?.email ?? '…';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.row}>
        <View style={styles.brandCol}>
          <Text style={styles.brand}>Meetopoly</Text>
          <Text style={styles.subtitle}>Signed in as {who}</Text>
        </View>

        <View style={styles.actions}>
          <Button
            label="Play"
            onPress={() => {
              router.push('/(app)/board');
            }}
            style={styles.playBtn}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.push('/(app)/settings');
            }}
            style={({ pressed }) => [
              styles.secondary,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.secondaryLabel}>Settings</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.push('/(app)/about');
            }}
            style={({ pressed }) => [
              styles.secondary,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.secondaryLabel}>About Meetopoly</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={logout.isPending}
            onPress={() => {
              void logout.mutateAsync();
            }}
            style={({ pressed }) => [
              styles.logout,
              pressed || logout.isPending ? styles.pressed : null,
            ]}
          >
            <Text style={styles.logoutLabel}>
              {logout.isPending ? 'Signing out…' : 'Log out'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
    paddingHorizontal: 40,
    paddingVertical: 24,
  },
  brandCol: {
    flex: 1,
    maxWidth: 360,
  },
  brand: {
    fontFamily: fonts.displayBold,
    fontSize: 48,
    color: colors.brand,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22,
    color: colors.muted,
  },
  actions: {
    width: 260,
    gap: 12,
  },
  playBtn: {
    height: 52,
  },
  secondary: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.ink,
  },
  logout: {
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.danger,
  },
  pressed: {
    opacity: 0.8,
  },
});
