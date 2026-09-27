import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ECONOMY_MODAL_MS,
  type EconomyEvent,
} from '@/lib/economyFeedback';

/**
 * Phase 9.3 — queue economy celebration modals (`ECONOMY_MODAL_MS` each, no overlap).
 */
export function useEconomyEventQueue(): {
  current: EconomyEvent | null;
  enqueue: (event: EconomyEvent) => void;
} {
  const [queue, setQueue] = useState<EconomyEvent[]>([]);
  const current = queue[0] ?? null;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enqueue = useCallback((event: EconomyEvent) => {
    setQueue((prev) => [...prev, event]);
  }, []);

  // Key by toastMessage+kind so enqueue of a *next* item does not reset the
  // active item's timer (queue[0] reference stays stable anyway).
  const currentKey = current
    ? `${current.kind}:${current.toastTitle}:${current.toastMessage}`
    : null;

  useEffect(() => {
    if (!currentKey) {
      return;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setQueue((prev) => prev.slice(1));
      timerRef.current = null;
    }, ECONOMY_MODAL_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentKey]);

  return { current, enqueue };
}
