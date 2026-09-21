import Toast, { BaseToast, type ToastConfig } from 'react-native-toast-message';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

function toastStyle(accent: string) {
  return {
    style: [styles.base, { borderLeftColor: accent }],
    contentContainerStyle: styles.content,
    text1Style: styles.text1,
    text2Style: styles.text2,
    text1NumberOfLines: 2,
    text2NumberOfLines: 3,
  };
}

/** Branded toast UI for success / warning / error / info. */
export const toastConfig: ToastConfig = {
  success: (props) => <BaseToast {...props} {...toastStyle(colors.success)} />,
  warning: (props) => <BaseToast {...props} {...toastStyle(colors.warn)} />,
  error: (props) => <BaseToast {...props} {...toastStyle(colors.danger)} />,
  info: (props) => <BaseToast {...props} {...toastStyle(colors.info)} />,
};

const styles = StyleSheet.create({
  base: {
    width: '92%',
    maxWidth: 480,
    minHeight: 56,
    borderRadius: 12,
    borderLeftWidth: 5,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  content: {
    paddingHorizontal: 14,
  },
  text1: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
  },
  text2: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
});

export type NotifyType = 'success' | 'warning' | 'error' | 'info';

export type NotifyOptions = {
  type?: NotifyType;
  /** Short headline (toast text1). */
  title?: string;
  /** Supporting detail (toast text2). */
  message?: string;
  visibilityTime?: number;
};

const DEFAULT_TITLES: Record<NotifyType, string> = {
  success: 'Success',
  warning: 'Heads up',
  error: 'Something went wrong',
  info: 'Notice',
};

/**
 * Show a branded toast. Prefer this over calling Toast.show directly.
 */
export function notify(options: NotifyOptions) {
  const type = options.type ?? 'info';
  const title = options.title ?? DEFAULT_TITLES[type];
  Toast.show({
    type,
    text1: title,
    text2: options.message,
    position: 'top',
    visibilityTime: options.visibilityTime ?? 3500,
    topOffset: 48,
  });
}
