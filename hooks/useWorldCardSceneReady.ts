import { useEffect, useState } from 'react';

/**
 * After locations settle on the focused card, defer + wait 2 frames so SVG
 * floaters can mount before Ken Burns starts (avoids pan hitch).
 * Avoids deprecated InteractionManager (RN 0.86+).
 */
export function useWorldCardSceneReady(
  active: boolean,
  contentReady: boolean,
  worldId: string,
): boolean {
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    if (!active || !contentReady) {
      setSceneReady(false);
      return;
    }

    let cancelled = false;
    let outerRaf = 0;
    let innerRaf = 0;
    const defer =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 1);
    const cancelDefer =
      typeof cancelIdleCallback === 'function'
        ? cancelIdleCallback
        : clearTimeout;

    const deferId = defer(() => {
      outerRaf = requestAnimationFrame(() => {
        innerRaf = requestAnimationFrame(() => {
          if (!cancelled) {
            setSceneReady(true);
          }
        });
      });
    });

    return () => {
      cancelled = true;
      cancelDefer(deferId as number);
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
    };
  }, [active, contentReady, worldId]);

  return sceneReady;
}
