import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ViewToken,
} from 'react-native';
import type { FlashListRef } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { listLocations } from '@/api/services';
import type { WorldSummary } from '@/api/types';

export type WorldsCarouselExtraData = {
  selectedId: string | null;
  activeWorldId: string | null;
};

type UseWorldsCarouselArgs = {
  worlds: WorldSummary[];
};

/**
 * Choose-a-World carousel state: selection, focused page, viewport, FlashList refs.
 */
export function useWorldsCarousel({ worlds }: UseWorldsCarouselArgs) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [index, setIndex] = useState(0);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const listRef = useRef<FlashListRef<WorldSummary>>(null);

  const pageWidth = viewport.w;
  const pageHeight = viewport.h;
  const layoutReady = pageWidth > 0 && pageHeight > 0;
  const activeWorldId = worlds[index]?.worldId ?? null;

  // Prefetch neighbors so swipe rarely shows the loader.
  useEffect(() => {
    for (const offset of [-1, 1] as const) {
      const neighbor = worlds[index + offset];
      if (!neighbor) {
        continue;
      }
      const worldId = neighbor.worldId.trim();
      if (!worldId) {
        continue;
      }
      void queryClient.prefetchQuery({
        queryKey: queryKeys.locations(worldId),
        queryFn: () => listLocations({ worldId }),
      });
    }
  }, [index, worlds, queryClient]);
  const selected = worlds.find((w) => w.worldId === selectedId) ?? null;
  const canAct = selected != null;
  const canGoPrev = index > 0;
  const canGoNext = index < worlds.length - 1;

  const selectIndexRef = useRef((next: number) => {
    void next;
  });

  const selectIndex = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(worlds.length - 1, next));
      const item = worlds[clamped];
      if (item) {
        setSelectedId(item.worldId);
      }
      setIndex(clamped);
    },
    [worlds],
  );
  selectIndexRef.current = selectIndex;

  useEffect(() => {
    if (worlds.length === 0) {
      return;
    }
    setSelectedId((prev) => {
      if (prev && worlds.some((w) => w.worldId === prev)) {
        return prev;
      }
      return worlds[0]!.worldId;
    });
  }, [worlds]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const i = worlds.findIndex((w) => w.worldId === selectedId);
    if (i >= 0) {
      setIndex(i);
    }
  }, [selectedId, worlds]);

  const goToIndex = useCallback(
    (next: number) => {
      if (pageWidth <= 0 || worlds.length === 0) {
        return;
      }
      const clamped = Math.max(0, Math.min(worlds.length - 1, next));
      selectIndex(clamped);
      listRef.current?.scrollToIndex({ index: clamped, animated: true });
    },
    [pageWidth, selectIndex, worlds.length],
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pageWidth <= 0) {
        return;
      }
      const next = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
      selectIndex(next);
    },
    [selectIndex, pageWidth],
  );

  const onViewableItemsChanged = useRef(
    (info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => {
      const first = info.viewableItems.find(
        (v) => v.isViewable && v.index != null,
      );
      if (first?.index != null) {
        selectIndexRef.current(first.index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const onViewportLayout = useCallback((width: number, height: number) => {
    if (width <= 0 || height <= 0) {
      return;
    }
    setViewport((prev) =>
      prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  }, []);

  const toggleSelect = useCallback((worldId: string) => {
    setSelectedId((prev) => (prev === worldId ? null : worldId));
  }, []);

  const onDragActiveChange = useCallback((dragActive: boolean) => {
    setScrollEnabled(!dragActive);
  }, []);

  const extraData = useMemo<WorldsCarouselExtraData>(
    () => ({ selectedId, activeWorldId }),
    [selectedId, activeWorldId],
  );

  const drawDistance = pageWidth > 0 ? pageWidth : 200;

  return {
    listRef,
    selectedId,
    selected,
    activeWorldId,
    index,
    scrollEnabled,
    pageWidth,
    pageHeight,
    layoutReady,
    canAct,
    canGoPrev,
    canGoNext,
    extraData,
    drawDistance,
    goToIndex,
    onMomentumScrollEnd,
    onViewableItemsChanged,
    viewabilityConfig,
    onViewportLayout,
    toggleSelect,
    onDragActiveChange,
  };
}
