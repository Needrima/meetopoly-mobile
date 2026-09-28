import { useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { CenterDeckLayout } from '@/components/board/boardLayout';
import { DECK_DRAW_FLY_MS } from '@/lib/economyFeedback';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

export type DeckDrawFlyModel = {
  key: string;
  deck: CenterDeckLayout;
  boardSize: number;
};

type DeckDrawFlyCardProps = {
  fly: DeckDrawFlyModel;
  onComplete: (key: string) => void;
};

/**
 * Top card peels off a center deck and flies off the board (clipped by Board).
 * Chance → SE; Chest → NW. Runs once per `fly.key`.
 * Always invokes `onComplete` once (animation end, timeout fallback, or unmount).
 */
export function DeckDrawFlyCard({ fly, onComplete }: DeckDrawFlyCardProps) {
  const { deck, boardSize, key } = fly;
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const rot = useSharedValue(deck.rotationDeg);
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
    const outward = deck.id === 'chance' ? 1 : -1;
    const dist = boardSize * 0.58;
    const finish = () => {
      if (completedRef.current) {
        return;
      }
      completedRef.current = true;
      onComplete(key);
    };

    tx.value = 0;
    ty.value = 0;
    scale.value = 1;
    opacity.value = 1;
    rot.value = deck.rotationDeg;

    const ease = Easing.out(Easing.cubic);
    tx.value = withTiming(outward * dist, {
      duration: DECK_DRAW_FLY_MS,
      easing: ease,
    });
    ty.value = withTiming(outward * dist, {
      duration: DECK_DRAW_FLY_MS,
      easing: ease,
    });
    scale.value = withTiming(1.12, {
      duration: DECK_DRAW_FLY_MS,
      easing: ease,
    });
    rot.value = withTiming(deck.rotationDeg + outward * 18, {
      duration: DECK_DRAW_FLY_MS,
      easing: ease,
    });
    opacity.value = withTiming(
      0,
      {
        duration: DECK_DRAW_FLY_MS,
        easing: Easing.in(Easing.quad),
      },
      (finished) => {
        if (finished) {
          runOnJS(finish)();
        }
      },
    );

    // Fallback if Reanimated cancels the timing without finished=true.
    const fallback = setTimeout(finish, DECK_DRAW_FLY_MS + 80);
    return () => {
      clearTimeout(fallback);
      finish();
    };
  }, [key, deck, boardSize, onComplete, tx, ty, scale, opacity, rot]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${rot.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const left = deck.cx - deck.deckW / 2;
  const top = deck.cy - deck.deckH / 2;
  const label = deck.id === 'chance' ? 'CHANCE' : 'CHEST';
  const labelSize = Math.max(9, Math.min(12, deck.deckW * 0.22));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.card,
        {
          left,
          top,
          width: deck.deckW,
          height: deck.deckH,
          backgroundColor: deck.fill,
          borderColor: deck.stroke,
        },
        animStyle,
      ]}
      accessibilityLabel={`${label} card drawn`}
    >
      <Text style={[styles.label, { fontSize: labelSize }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    elevation: 30,
  },
  label: {
    fontFamily: fonts.displayBold,
    color: colors.ink,
    letterSpacing: 0.6,
    opacity: 0.9,
  },
});
