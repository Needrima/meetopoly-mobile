import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

export type BoardOverflowMenuProps = {
  visible: boolean;
  onClose: () => void;
  onLeave: () => void;
  onHealth: () => void;
  onLocations: () => void;
};

type MenuItem = {
  key: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
};

const DRAWER_WIDTH = 300;

/**
 * Board ⋯ right drawer (absolute overlay, not RN Modal).
 * Leave game / Health / Locations — Log out lives on the home menu only.
 */
export function BoardOverflowMenu({
  visible,
  onClose,
  onLeave,
  onHealth,
  onLocations,
}: BoardOverflowMenuProps) {
  const insets = useSafeAreaInsets();

  if (!visible) {
    return null;
  }

  const items: MenuItem[] = [
    {
      key: 'health',
      label: 'Health',
      onPress: () => {
        onClose();
        onHealth();
      },
    },
    {
      key: 'locations',
      label: 'Locations',
      onPress: () => {
        onClose();
        onLocations();
      },
    },
    {
      key: 'leave',
      label: 'Leave game',
      danger: true,
      onPress: () => {
        onClose();
        onLeave();
      },
    },
  ];

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Dismiss menu"
      />
      <MotiView
        from={{ translateX: DRAWER_WIDTH }}
        animate={{ translateX: 0 }}
        transition={{ type: 'timing', duration: 220 }}
        style={[
          styles.drawer,
          {
            width: DRAWER_WIDTH,
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 24),
            paddingRight: Math.max(insets.right, 16),
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed ? styles.pressed : null,
            ]}
          >
            <Ionicons name="close" size={26} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {items.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.row,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text
                style={[styles.rowLabel, item.danger ? styles.danger : null]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFill,
    zIndex: 40,
    elevation: 40,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 44,
    marginBottom: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: 4,
    paddingTop: 4,
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  rowLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.brand,
  },
  danger: {
    color: colors.danger,
  },
  pressed: {
    opacity: 0.7,
  },
});
