import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Board } from '@/components/board/Board';
import { BoardPanel } from '@/components/board/BoardPanel';
import { DEFAULT_WORLD_ID, useLocations } from '@/hooks/useLocations';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

const PANEL_MIN = 168;

/**
 * Phase 4.3 — landscape board with icons + short names.
 */
export default function BoardScreen() {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { data, error, isLoading, isError } = useLocations(DEFAULT_WORLD_ID);

  const availableW = winW - insets.left - insets.right;
  const boardSide = Math.max(0, Math.min(winH, availableW - PANEL_MIN));
  const locations = data?.locations ?? [];

  return (
    <View style={styles.root}>
      <View style={[styles.main, { paddingLeft: insets.left, paddingRight: insets.right }]}>
        <View style={[styles.boardRail, { width: boardSide, height: boardSide }]}>
          {isLoading ? (
            <View style={styles.boardState}>
              <ActivityIndicator color={colors.onBrand} />
              <Text style={styles.boardStateText}>Loading {DEFAULT_WORLD_ID}…</Text>
            </View>
          ) : null}

          {isError ? (
            <View style={styles.boardState}>
              <Text style={styles.boardStateError}>
                {error instanceof Error ? error.message : 'Failed to load locations'}
              </Text>
            </View>
          ) : null}

          {!isLoading && !isError ? <Board size={boardSide} locations={locations} /> : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(app)');
              }
            }}
            style={({ pressed }) => [styles.back, pressed ? styles.pressed : null]}
          >
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>
        </View>

        <View style={[styles.panelRail, { height: boardSide }]}>
          <Text style={styles.phase}>
            Phase 4.3 · {locations.length || '…'} slots · {DEFAULT_WORLD_ID}
          </Text>
          <BoardPanel />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  boardRail: {
    position: 'relative',
    flexShrink: 0,
    overflow: 'hidden',
    backgroundColor: colors.brandMuted,
  },
  boardState: {
    ...(StyleSheet.absoluteFill as object),
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  boardStateText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onBrand,
  },
  boardStateError: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
  back: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 2,
    borderRadius: 10,
    backgroundColor: colors.hud,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.75,
  },
  backLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.onBrand,
  },
  panelRail: {
    flex: 1,
    minWidth: PANEL_MIN,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  phase: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
});
