import { useEffect, useRef, useState } from 'react';

import { MeetCoinAmount } from '@/components/ui/MeetCoinAmount';
import { colors } from '@/theme/colors';

type AnimatedMeetCoinAmountProps = {
  amount: number;
  size?: number;
  color?: string;
  /** Tick duration in ms (default ~500). */
  durationMs?: number;
};

/**
 * MeetCoin HUD amount that ticks up/down toward the new balance.
 */
export function AnimatedMeetCoinAmount({
  amount,
  size = 16,
  color = colors.ink,
  durationMs = 500,
}: AnimatedMeetCoinAmountProps) {
  const [display, setDisplay] = useState(amount);
  const displayRef = useRef(amount);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    const from = displayRef.current;
    const to = amount;
    if (from === to) {
      return;
    }
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const start = performance.now();
    const delta = to - from;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(from + delta * eased);
      setDisplay(next);
      displayRef.current = next;
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        setDisplay(to);
        displayRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [amount, durationMs]);

  return <MeetCoinAmount amount={display} size={size} color={color} />;
}
