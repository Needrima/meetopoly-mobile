import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/**
 * When enabled, consume Android hardware back so the screen cannot be popped.
 * Pair with Stack `gestureEnabled: false` for iOS swipe-back.
 */
export function useBlockHardwareBack(enabled = true): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [enabled]);
}
