import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/** Phase 4.8 stub — real settings later. */
export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(app)');
            }
          }}
          style={({ pressed }) => [styles.back, pressed ? styles.pressed : null]}
        >
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>
      <Text style={styles.body}>
        Coming soon — profile photo, notifications, and more.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  back: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.brand,
  },
  body: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
    maxWidth: 480,
  },
  pressed: {
    opacity: 0.75,
  },
});
