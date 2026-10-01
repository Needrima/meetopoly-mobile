import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMuteMic } from '@/hooks/useMuteMic';
import { useMuteVideo } from '@/hooks/useMuteVideo';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/**
 * Phase 9.2 — home Settings. Mute persists for Phase 10 voice.
 * Phase 16.1 — board camera off (`muteVideo`).
 * RN Switch (not @expo/ui) — Compose Host+Switch wraps label vertically on Android.
 * Leave stays board ⋯ only; report deferred until player picker + API.
 */
export default function SettingsScreen() {
  const { muted, ready, setMuted } = useMuteMic();
  const {
    muted: videoMuted,
    ready: videoReady,
    setMuted: setVideoMuted,
  } = useMuteVideo();

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

      <View style={styles.card}>
        <Text style={styles.section}>Voice</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Mute microphone</Text>
          <Switch
            value={muted}
            onValueChange={setMuted}
            disabled={!ready}
            trackColor={{ false: colors.border, true: colors.brandMuted }}
            thumbColor={muted ? colors.onBrand : colors.surface}
            ios_backgroundColor={colors.border}
            accessibilityLabel="Mute microphone"
          />
        </View>
        <Text style={styles.hint}>
          Also available from the hub Voice rail and board seat mic control.
          Muted mic stays off until you unmute.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Video</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Camera off</Text>
          <Switch
            value={videoMuted}
            onValueChange={setVideoMuted}
            disabled={!videoReady}
            trackColor={{ false: colors.border, true: colors.brandMuted }}
            thumbColor={videoMuted ? colors.onBrand : colors.surface}
            ios_backgroundColor={colors.border}
            accessibilityLabel="Camera off"
          />
        </View>
        <Text style={styles.hint}>
          Board only — hubs stay audio-only. Also toggled from your board seat
          tile. Camera stays off until you turn it back on.
        </Text>
      </View>
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
  card: {
    marginTop: 8,
    maxWidth: 480,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  section: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 44,
  },
  label: {
    flex: 1,
    flexShrink: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.ink,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  pressed: {
    opacity: 0.75,
  },
});
