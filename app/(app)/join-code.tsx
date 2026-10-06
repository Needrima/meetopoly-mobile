import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/**
 * Phase 20.3 — navigation stub for join-by-code.
 * Form + API wire-up lands in 20.5.
 */
export default function JoinCodeStubScreen() {
  const back = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/play');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={back}
          hitSlop={8}
          style={({ pressed }) => [
            styles.backBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.brand} />
        </Pressable>
        <View style={styles.headerCenter} pointerEvents="none">
          <Text style={styles.title}>Join with code</Text>
          <Text style={styles.subtitle}>Enter an invite from a friend</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <Text style={styles.hint}>
          Invite code entry comes next. Use Back to return to Play.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: -40,
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.brand,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 360,
  },
  pressed: {
    opacity: 0.8,
  },
});
