import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/**
 * Phase 20.3 — Play hub between menu and World / invite flows.
 */
export default function PlayHubScreen() {
  const back = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to menu"
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
          <Text style={styles.title}>Play</Text>
          <Text style={styles.subtitle}>How would you like to play?</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <View style={styles.actions}>
          <Button
            label="Play with the world"
            onPress={() => {
              router.push({
                pathname: '/(app)/worlds',
                params: { mode: 'public' },
              });
            }}
            style={styles.cta}
          />
          <Button
            label="Start a game"
            variant="outline"
            onPress={() => {
              router.push({
                pathname: '/(app)/worlds',
                params: { mode: 'private' },
              });
            }}
            style={styles.cta}
          />
          <Button
            label="Join a game with invite code"
            variant="outline"
            onPress={() => {
              router.push('/(app)/join-code');
            }}
            style={styles.cta}
          />
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
    paddingVertical: 24,
  },
  actions: {
    width: '100%',
    maxWidth: 360,
    gap: 12,
  },
  cta: {
    height: 52,
  },
  pressed: {
    opacity: 0.8,
  },
});
