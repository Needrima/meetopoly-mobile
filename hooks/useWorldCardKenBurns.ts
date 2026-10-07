import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  type ImageSourcePropType,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAppActive } from '@/hooks/useAppActive';

/** Scale past cover so both axes always have pan room (avoids edge gaps). */
const COVER_BLEED = 1.12;
/** Keep a few px of image past every edge during Ken Burns / pan. */
const EDGE_INSET = 4;

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function resolveIntrinsicSize(source: ImageSourcePropType): {
  width: number;
  height: number;
} | null {
  const resolved = Image.resolveAssetSource(source);
  if (
    !resolved ||
    typeof resolved.width !== 'number' ||
    typeof resolved.height !== 'number' ||
    resolved.width <= 0 ||
    resolved.height <= 0
  ) {
    return null;
  }
  return { width: resolved.width, height: resolved.height };
}

type UseWorldCardKenBurnsArgs = {
  worldId: string;
  image: ImageSourcePropType | null | undefined;
  /** Focused carousel page — pause drift when false. */
  active: boolean;
  onSelect: () => void;
  onDragActiveChange?: (active: boolean) => void;
};

export function useWorldCardKenBurns({
  worldId,
  image,
  active,
  onSelect,
  onDragActiveChange,
}: UseWorldCardKenBurnsArgs) {
  const appActive = useAppActive();
  const running = active && appActive;
  const runningRef = useRef(running);
  runningRef.current = running;

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onDragRef = useRef(onDragActiveChange);
  onDragRef.current = onDragActiveChange;

  const intrinsic = useMemo(
    () => (image ? resolveIntrinsicSize(image) : null),
    [image],
  );
  const seed = useMemo(() => hashSeed(worldId), [worldId]);

  const [box, setBox] = useState({ w: 0, h: 0 });

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const minX = useSharedValue(0);
  const maxX = useSharedValue(0);
  const minY = useSharedValue(0);
  const maxY = useSharedValue(0);
  const dragOriginX = useSharedValue(0);
  const dragOriginY = useSharedValue(0);
  const dragging = useSharedValue(0);
  const layoutReady = useSharedValue(0);
  const durX = useSharedValue(10000);
  const durY = useSharedValue(12000);

  const scaled = useMemo(() => {
    if (!intrinsic || box.w <= 0 || box.h <= 0) {
      return null;
    }
    const scale =
      Math.max(box.w / intrinsic.width, box.h / intrinsic.height) * COVER_BLEED;
    const width = intrinsic.width * scale;
    const height = intrinsic.height * scale;
    const rawMinX = box.w - width;
    const rawMinY = box.h - height;
    const insetX = Math.min(EDGE_INSET, Math.max(0, (width - box.w) / 2));
    const insetY = Math.min(EDGE_INSET, Math.max(0, (height - box.h) / 2));
    return {
      width,
      height,
      minX: rawMinX + insetX,
      maxX: -insetX,
      minY: rawMinY + insetY,
      maxY: -insetY,
    };
  }, [intrinsic, box.w, box.h]);

  const startDrift = useCallback(() => {
    cancelAnimation(tx);
    cancelAnimation(ty);
    tx.value = withRepeat(
      withSequence(
        withTiming(maxX.value, {
          duration: durX.value,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(minX.value, {
          duration: durX.value,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      false,
    );
    ty.value = withRepeat(
      withSequence(
        withTiming(minY.value, {
          duration: durY.value,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(maxY.value, {
          duration: durY.value,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      false,
    );
  }, [tx, ty, minX, maxX, minY, maxY, durX, durY]);

  useEffect(() => {
    if (!scaled) {
      layoutReady.value = 0;
      cancelAnimation(tx);
      cancelAnimation(ty);
      return;
    }

    minX.value = scaled.minX;
    maxX.value = scaled.maxX;
    minY.value = scaled.minY;
    maxY.value = scaled.maxY;
    durX.value = 9000 + (seed % 5) * 1100;
    durY.value = 11000 + (seed % 7) * 900;

    const cx = (scaled.minX + scaled.maxX) / 2;
    const cy = (scaled.minY + scaled.maxY) / 2;
    if (layoutReady.value === 0) {
      tx.value = cx;
      ty.value = cy;
    } else {
      tx.value = Math.min(scaled.maxX, Math.max(scaled.minX, tx.value));
      ty.value = Math.min(scaled.maxY, Math.max(scaled.minY, ty.value));
    }
    layoutReady.value = 1;

    if (!running) {
      cancelAnimation(tx);
      cancelAnimation(ty);
      return;
    }

    startDrift();

    return () => {
      cancelAnimation(tx);
      cancelAnimation(ty);
    };
  }, [
    scaled,
    seed,
    running,
    startDrift,
    tx,
    ty,
    minX,
    maxX,
    minY,
    maxY,
    layoutReady,
    durX,
    durY,
  ]);

  const fireSelect = useCallback(() => {
    onSelectRef.current();
  }, []);

  const setDragActive = useCallback((dragActive: boolean) => {
    onDragRef.current?.(dragActive);
  }, []);

  const resumeDrift = useCallback(() => {
    if (!runningRef.current) {
      return;
    }
    startDrift();
  }, [startDrift]);

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(fireSelect)();
    });

  const pan = Gesture.Pan()
    .minPointers(2)
    .maxPointers(2)
    .onStart(() => {
      dragOriginX.value = tx.value;
      dragOriginY.value = ty.value;
      cancelAnimation(tx);
      cancelAnimation(ty);
      dragging.value = 1;
      runOnJS(setDragActive)(true);
    })
    .onUpdate((e) => {
      const nextX = dragOriginX.value + e.translationX;
      const nextY = dragOriginY.value + e.translationY;
      tx.value = Math.min(maxX.value, Math.max(minX.value, nextX));
      ty.value = Math.min(maxY.value, Math.max(minY.value, nextY));
    })
    .onFinalize(() => {
      if (dragging.value === 0) {
        return;
      }
      dragging.value = 0;
      runOnJS(setDragActive)(false);
      runOnJS(resumeDrift)();
    });

  const gesture = Gesture.Simultaneous(pan, tap);

  const imageStyle = useAnimatedStyle(() => {
    const x = Math.min(maxX.value, Math.max(minX.value, tx.value));
    const y = Math.min(maxY.value, Math.max(minY.value, ty.value));
    return {
      transform: [{ translateX: x }, { translateY: y }],
    };
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width <= 0 || height <= 0) {
      return;
    }
    setBox((prev) =>
      prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  };

  return {
    box,
    scaled,
    gesture,
    imageStyle,
    onLayout,
  };
}
