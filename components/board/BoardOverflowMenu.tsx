import { MotiView } from 'moti';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

export type BoardOverflowMenuProps = {
  visible: boolean;
  onClose: () => void;
  onLeave: () => void;
  onLogout: () => void;
  logoutPending?: boolean;
  /** __DEV__ only — Health debug screen. */
  onHealth?: () => void;
  /** __DEV__ only — Locations list. */
  onLocations?: () => void;
};

type MenuItem = {
  key: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
};

/**
 * Board ⋯ menu overlay (absolute, not RN Modal). Leave is the only exit off the board.
 */
export function BoardOverflowMenu({
  visible,
  onClose,
  onLeave,
  onLogout,
  logoutPending = false,
  onHealth,
  onLocations,
}: BoardOverflowMenuProps) {
  if (!visible) {
    return null;
  }

  const items: MenuItem[] = [
    {
      key: 'leave',
      label: 'Leave board',
      onPress: () => {
        onClose();
        onLeave();
      },
    },
  ];

  if (__DEV__ && onHealth) {
    items.push({
      key: 'health',
      label: 'Health',
      onPress: () => {
        onClose();
        onHealth();
      },
    });
  }
  if (__DEV__ && onLocations) {
    items.push({
      key: 'locations',
      label: 'Locations',
      onPress: () => {
        onClose();
        onLocations();
      },
    });
  }

  items.push({
    key: 'logout',
    label: logoutPending ? 'Signing out…' : 'Log out',
    danger: true,
    disabled: logoutPending,
    onPress: () => {
      if (!logoutPending) {
        onClose();
        onLogout();
      }
    },
  });

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Dismiss menu"
      />
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 160 }}
        style={styles.sheet}
      >
        {items.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            disabled={item.disabled}
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.row,
              pressed || item.disabled ? styles.pressed : null,
            ]}
          >
            <Text
              style={[styles.rowLabel, item.danger ? styles.danger : null]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFill,
    zIndex: 40,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  sheet: {
    position: 'absolute',
    top: 12,
    right: 12,
    minWidth: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
  },
  danger: {
    color: colors.danger,
  },
  pressed: {
    opacity: 0.7,
  },
});
