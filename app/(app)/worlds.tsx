import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from "react-native";
import { router } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import type { WorldSummary } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { WorldCard } from "@/components/worlds/WorldCard";
import { useWorlds } from "@/hooks/useLocations";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

/**
 * Phase 5.0 — pick a World (carousel); Proceed → lobby; See locations → browse.
 * One-finger swipe pages the carousel; two-finger pan explores the map image.
 */
export default function WorldsScreen() {
  const { data, error, isLoading, isError } = useWorlds();
  const worlds = data?.worlds ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [index, setIndex] = useState(0);
  /** Exact FlatList viewport — must match page width (not window; SafeArea insets). */
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const listRef = useRef<FlatList<WorldSummary>>(null);

  const selected = worlds.find((w) => w.worldId === selectedId) ?? null;
  const canAct = selected != null;
  const pageWidth = viewport.w;
  const pageHeight = viewport.h;
  const ready = pageWidth > 0 && pageHeight > 0;
  const canGoPrev = index > 0;
  const canGoNext = index < worlds.length - 1;

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
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find((v) => v.isViewable && v.index != null);
      if (first?.index != null) {
        selectIndex(first.index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaView
        style={styles.safe}
        edges={["top", "right", "bottom", "left"]}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(app)");
              }
            }}
            hitSlop={8}
            style={({ pressed }) => [
              styles.backBtn,
              pressed ? styles.pressed : null,
            ]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.brand} />
          </Pressable>
          <Text style={styles.title} pointerEvents="none">
            Choose a World
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.muted}>Loading worlds…</Text>
          </View>
        ) : null}

        {isError ? (
          <View style={styles.center}>
            <Text style={styles.error}>
              {error instanceof Error ? error.message : "Failed to load worlds"}
            </Text>
          </View>
        ) : null}

        {!isLoading && !isError ? (
          <View
            style={styles.carouselHost}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              if (width <= 0 || height <= 0) {
                return;
              }
              setViewport((prev) =>
                prev.w === width && prev.h === height
                  ? prev
                  : { w: width, h: height },
              );
            }}
          >
            {worlds.length === 0 ? (
              <Text style={styles.muted}>No worlds returned from the API.</Text>
            ) : ready ? (
              <>
                <FlatList
                  ref={listRef}
                  data={worlds}
                  keyExtractor={(item) => item.worldId}
                  style={styles.list}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  scrollEnabled={scrollEnabled}
                  decelerationRate="fast"
                  disableIntervalMomentum
                  getItemLayout={(_, i) => ({
                    length: pageWidth,
                    offset: pageWidth * i,
                    index: i,
                  })}
                  onMomentumScrollEnd={onMomentumScrollEnd}
                  onViewableItemsChanged={onViewableItemsChanged}
                  viewabilityConfig={viewabilityConfig}
                  onScrollToIndexFailed={(info) => {
                    const wait = new Promise((r) => setTimeout(r, 80));
                    void wait.then(() => {
                      listRef.current?.scrollToIndex({
                        index: info.index,
                        animated: true,
                      });
                    });
                  }}
                  renderItem={({ item }) => (
                    <View
                      style={[
                        styles.page,
                        { width: pageWidth, height: pageHeight },
                      ]}
                    >
                      <WorldCard
                        world={item}
                        selected={item.worldId === selectedId}
                        onSelect={() =>
                          setSelectedId((prev) =>
                            prev === item.worldId ? null : item.worldId,
                          )
                        }
                        onDragActiveChange={(active) => {
                          setScrollEnabled(!active);
                        }}
                        style={styles.card}
                      />
                    </View>
                  )}
                />
                <View
                  pointerEvents="box-none"
                  style={styles.navOverlay}
                >
                  <View style={styles.navRailLeft} pointerEvents="box-none">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Previous world"
                      disabled={!canGoPrev}
                      onPress={() => goToIndex(index - 1)}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.navArrow,
                        !canGoPrev ? styles.navArrowDisabled : null,
                        pressed && canGoPrev ? styles.pressed : null,
                      ]}
                    >
                      <Ionicons
                        name="chevron-back"
                        size={28}
                        color={canGoPrev ? colors.brand : colors.muted}
                      />
                    </Pressable>
                  </View>
                  <View style={styles.navRailRight} pointerEvents="box-none">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Next world"
                      disabled={!canGoNext}
                      onPress={() => goToIndex(index + 1)}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.navArrow,
                        !canGoNext ? styles.navArrowDisabled : null,
                        pressed && canGoNext ? styles.pressed : null,
                      ]}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={28}
                        color={canGoNext ? colors.brand : colors.muted}
                      />
                    </Pressable>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.footerBtn}>
            <Button
              label="See locations"
              variant="outline"
              disabled={!canAct}
              onPress={() => {
                if (!selected) {
                  return;
                }
                router.push({
                  pathname: "/(app)/locations",
                  params: { worldId: selected.worldId },
                });
              }}
            />
          </View>
          <View style={styles.footerBtn}>
            <Button
              label="Proceed"
              disabled={!canAct}
              onPress={() => {
                if (!selected) {
                  return;
                }
                router.push(`/(app)/lobby/${selected.worldId}`);
              }}
            />
          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: colors.brand,
  },
  carouselHost: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
    position: "relative",
  },
  list: {
    flex: 1,
  },
  page: {
    paddingHorizontal: 56,
    paddingVertical: 14,
    overflow: "hidden",
  },
  card: {
    flex: 1,
  },
  navOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
  },
  navRailLeft: {
    position: "absolute",
    left: 8,
    top: 0,
    bottom: 0,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  navRailRight: {
    position: "absolute",
    right: 8,
    top: 0,
    bottom: 0,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  navArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  navArrowDisabled: {
    opacity: 0.45,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  footerBtn: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  muted: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    width: "100%",
    paddingVertical: 24,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.danger,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.85,
  },
});
