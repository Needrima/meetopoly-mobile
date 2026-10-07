import { Ionicons } from "@expo/vector-icons";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { router, useLocalSearchParams } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import type { WorldSummary } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { WorldCard } from "@/components/worlds/WorldCard";
import { useEnterLobby } from "@/hooks/useEnterLobby";
import { useWorlds } from "@/hooks/useLocations";
import { useWorldsCarousel } from "@/hooks/useWorldsCarousel";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

/**
 * Phase 5.0 + 20.4 — pick a World; Proceed → public lobby or private create.
 * One-finger swipe pages the carousel; two-finger pan explores the map image.
 */
export default function WorldsScreen() {
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const lobbyMode = modeParam === "private" ? "private" : "public";

  const { data, error, isLoading, isError } = useWorlds();
  const { enter, loading: entering, error: enterError } = useEnterLobby();
  const worlds = data?.worlds ?? [];

  const {
    listRef,
    selected,
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
  } = useWorldsCarousel({ worlds });

  const renderItem = useCallback<ListRenderItem<WorldSummary>>(
    ({ item }) => {
      const selectedItem = item.worldId === extraData.selectedId;
      const active = item.worldId === extraData.activeWorldId;
      return (
        <View
          style={[styles.page, { width: pageWidth, height: pageHeight }]}
        >
          <WorldCard
            world={item}
            selected={selectedItem}
            active={active}
            onToggleSelect={toggleSelect}
            onDragActiveChange={onDragActiveChange}
            style={styles.card}
          />
        </View>
      );
    },
    [
      pageWidth,
      pageHeight,
      extraData.selectedId,
      extraData.activeWorldId,
      toggleSelect,
      onDragActiveChange,
    ],
  );

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
            {lobbyMode === "private" ? "Start a game" : "Choose a World"}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {enterError ? (
          <Text style={styles.enterError}>{enterError}</Text>
        ) : null}

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
              onViewportLayout(width, height);
            }}
          >
            {worlds.length === 0 ? (
              <Text style={styles.muted}>No worlds returned from the API.</Text>
            ) : layoutReady ? (
              <>
                <FlashList
                  ref={listRef}
                  data={worlds}
                  extraData={extraData}
                  keyExtractor={(item) => item.worldId}
                  renderItem={renderItem}
                  style={styles.list}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  scrollEnabled={scrollEnabled}
                  decelerationRate="fast"
                  disableIntervalMomentum
                  drawDistance={drawDistance}
                  onMomentumScrollEnd={onMomentumScrollEnd}
                  onViewableItemsChanged={onViewableItemsChanged}
                  viewabilityConfig={viewabilityConfig}
                />
                <View pointerEvents="box-none" style={styles.navOverlay}>
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
              label={"Proceed"}
              disabled={!canAct || entering}
              loading={entering}
              onPress={() => {
                if (!selected) {
                  return;
                }
                void enter(selected.worldId, lobbyMode);
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
  enterError: {
    marginHorizontal: 20,
    marginBottom: 4,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.danger,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.85,
  },
});
