import { useCallback, useEffect, useState } from 'react';

import type { EconomyMode } from '@/lib/economyEligibility';

/**
 * Phase 11.4b — tap CTA → mode + how-to sheet; Close / toggle CTA exits mode
 * (clears sheet + board dim/highlights).
 */
export function useEconomyMode() {
  const [mode, setMode] = useState<EconomyMode | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const selectMode = useCallback((next: EconomyMode) => {
    setMode((prev) => {
      if (prev === next) {
        setSheetOpen(false);
        return null;
      }
      setSheetOpen(true);
      return next;
    });
  }, []);

  const clearMode = useCallback(() => {
    setMode(null);
    setSheetOpen(false);
  }, []);

  return {
    mode,
    sheetOpen,
    selectMode,
    clearMode,
  };
}

/** Drop economy mode when it is no longer your turn / game inactive. */
export function useClearEconomyWhenOffTurn(
  clearMode: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) {
      clearMode();
    }
  }, [enabled, clearMode]);
}
