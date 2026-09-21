import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

export type DropdownProps = {
  /** Shown when no value is selected. */
  placeholder: string;
  /** Display label for the current selection (not the raw id). */
  value?: string;
  onPress: () => void;
  /** Highlights the shell while the picker is open. */
  open?: boolean;
  disabled?: boolean;
  prefix?: ReactNode;
  /** Replaces the default chevron when provided. */
  suffix?: ReactNode;
};

/**
 * Generic picker trigger — AuthField-like shell that opens an external picker.
 */
export function Dropdown({
  placeholder,
  value,
  onPress,
  open = false,
  disabled = false,
  prefix,
  suffix,
}: DropdownProps) {
  const hasValue = Boolean(value);
  const resolvedSuffix =
    suffix !== undefined ? (
      suffix
    ) : (
      <Ionicons
        name={open ? 'chevron-up' : 'chevron-down'}
        size={20}
        color={colors.muted}
      />
    );

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled, expanded: open }}
      accessibilityLabel={hasValue ? value : placeholder}
      disabled={disabled}
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.shell,
        open ? styles.shellOpen : null,
        disabled ? styles.shellDisabled : null,
      ]}
    >
      {prefix ? <View style={styles.affix}>{prefix}</View> : null}
      <Text
        numberOfLines={1}
        style={[styles.label, hasValue ? styles.labelValue : styles.labelPlaceholder]}
      >
        {hasValue ? value : placeholder}
      </Text>
      <View style={styles.affix}>{resolvedSuffix}</View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    minHeight: 52,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C4BBA8',
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
  },
  shellOpen: {
    borderColor: colors.accent,
    backgroundColor: '#FFFEF9',
  },
  shellDisabled: {
    opacity: 0.55,
  },
  label: {
    flex: 1,
    paddingHorizontal: 4,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  labelValue: {
    color: colors.ink,
  },
  labelPlaceholder: {
    color: colors.muted,
  },
  affix: {
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
