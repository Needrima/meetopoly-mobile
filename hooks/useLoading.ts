import { useCallback, useState } from 'react';

/**
 * Reusable loading flag for buttons / overlays.
 * `startLoading` / `stopLoading` are stable (useCallback).
 */
export function useLoading(initial = false) {
  const [loading, setLoading] = useState(initial);

  const startLoading = useCallback(() => {
    setLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setLoading(false);
  }, []);

  return { loading, startLoading, stopLoading } as const;
}
