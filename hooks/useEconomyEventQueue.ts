import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ECONOMY_MODAL_MS,
  type EconomyEvent,
} from '@/lib/economyFeedback';

type QueuedEconomyEvent = {
  id: number;
  event: EconomyEvent;
};

/**
 * Phase 9.3 — queue economy celebration modals (`ECONOMY_MODAL_MS` each, no overlap).
 * Each item gets a unique id so identical toast copy still advances the timer.
 */
export function useEconomyEventQueue(): {
  current: EconomyEvent | null;
  /** True while any celebration modal is current or waiting. */
  busy: boolean;
  /** True if a Chance/Chest card is current or still queued. */
  hasCard: boolean;
  enqueue: (event: EconomyEvent) => void;
} {
  const [queue, setQueue] = useState<QueuedEconomyEvent[]>([]);
  const seqRef = useRef(0);
  const current = queue[0] ?? null;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enqueue = useCallback((event: EconomyEvent) => {
    seqRef.current += 1;
    const id = seqRef.current;
    setQueue((prev) => [...prev, { id, event }]);
  }, []);

  const currentId = current?.id ?? null;

  useEffect(() => {
    if (currentId == null) {
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
  }, [currentId]);

  return {
    current: current?.event ?? null,
    busy: queue.length > 0,
    hasCard: queue.some((q) => q.event.kind === 'card'),
    enqueue,
  };
}
