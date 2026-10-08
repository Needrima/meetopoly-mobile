import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

/**
 * After locations settle on the focused card, wait until interactions + 2 frames
 * so SVG floaters can mount before Ken Burns starts (avoids pan hitch).
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
    const handle = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) {
            setSceneReady(true);
          }
        });
      });
    });

    return () => {
      cancelled = true;
      handle.cancel();
    };
  }, [active, contentReady, worldId]);

  return sceneReady;
}
