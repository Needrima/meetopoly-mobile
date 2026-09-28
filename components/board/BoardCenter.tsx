import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon, Text as SvgText } from 'react-native-svg';

import {
  CENTER_DECK_ROTATION_DEG,
  type CenterDeckLayout,
} from '@/components/board/boardLayout';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/** Decorative stack depth — same for Chance and Chest. */
export const DECK_STACK_COUNT = 6;
/** Board-local px offset per layer (NW) so the pile reads as stacked cards. */
const STACK_STEP_X = 1.35;
const STACK_STEP_Y = -1.35;

type BoardCenterProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  decks: CenterDeckLayout[];
};

function stackPolygonPoints(
  deck: CenterDeckLayout,
  layer: number,
  originX: number,
  originY: number,
): string {
  const ox = layer * STACK_STEP_X;
  const oy = layer * STACK_STEP_Y;
  return deck.points
    .map((p) => `${p.x - originX + ox},${p.y - originY + oy}`)
    .join(' ');
}

/**
 * Phase 4.4 — center brand + Chance / Community Chest deck stacks.
 * Deck polygons are hard obstacles when walking (wired in 4.5).
 */
export function BoardCenter({ x, y, width, height, decks }: BoardCenterProps) {
  const labelSize = Math.max(9, Math.min(12, width * 0.035));

  return (
    <View
      pointerEvents="none"
      style={[styles.root, { left: x, top: y, width, height }]}
      accessibilityLabel="Board center with Chance and Community Chest decks"
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {decks.map((deck) => {
          const layers = [];
          for (let i = DECK_STACK_COUNT - 1; i >= 0; i -= 1) {
            layers.push(
              <Polygon
                key={`${deck.id}-layer-${i}`}
                points={stackPolygonPoints(deck, i, x, y)}
                fill={deck.fill}
                stroke={deck.stroke}
                strokeWidth={i === 0 ? 2 : 1.25}
                opacity={i === 0 ? 1 : 0.92}
              />,
            );
          }
          return layers;
        })}
        {decks.map((deck) => {
          const cx = deck.cx - x;
          const cy = deck.cy - y;
          const short = deck.id === 'chance' ? 'CHANCE' : 'CHEST';
          return (
            <SvgText
              key={`${deck.id}-label`}
              x={cx}
              y={cy + labelSize * 0.35}
              fill={colors.ink}
              fontSize={labelSize}
              fontWeight="700"
              textAnchor="middle"
              opacity={0.9}
              transform={`rotate(${CENTER_DECK_ROTATION_DEG}, ${cx}, ${cy})`}
            >
              {short}
            </SvgText>
          );
        })}
      </Svg>

      <View style={styles.brand} accessibilityRole="header">
        <Text style={styles.brandTitle}>Meetopoly</Text>
        <Text style={styles.brandTag}>Play the world</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: '#c5d9ce',
  },
  brand: {
    ...(StyleSheet.absoluteFill as object),
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  brandTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: colors.brand,
    textAlign: 'center',
  },
  brandTag: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
  },
});
