import { Pressable, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

import { useMuteMic } from '@/hooks/useMuteMic';
import { colors } from '@/theme/colors';

type MuteMicButtonProps = {
  /** Extra style for dock placement (e.g. board joystick cluster). */
  style?: object;
};

/**
 * Phase 10.3 / 10.4 — shared mute CTA (`muteMic` SecureStore SoT).
 * Icon-only: FontAwesome microphone / microphone-slash.
 */
export function MuteMicButton({ style }: MuteMicButtonProps) {
  const { muted, ready, setMuted } = useMuteMic();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={muted ? 'Unmute microphone' : 'Mute microphone'}
      accessibilityState={{ disabled: !ready, checked: muted }}
      disabled={!ready}
      hitSlop={8}
      onPress={() => setMuted(!muted)}
      style={({ pressed }) => [
        styles.muteBtn,
        muted ? styles.muteBtnMuted : styles.muteBtnLive,
        pressed ? styles.pressed : null,
        !ready ? styles.muteDisabled : null,
        style,
      ]}
    >
      <FontAwesome
        name={muted ? 'microphone-slash' : 'microphone'}
        size={22}
        color={muted ? colors.danger : colors.brand}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  muteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  muteBtnLive: {
    borderColor: colors.brand,
    backgroundColor: colors.bg,
  },
  muteBtnMuted: {
    borderColor: colors.danger,
    backgroundColor: colors.bg,
  },
  muteDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
});
