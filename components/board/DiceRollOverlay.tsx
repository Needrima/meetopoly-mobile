import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type DiceRollOverlayProps = {
  visible: boolean;
  rolling: boolean;
  die1: number;
  die2: number;
  username?: string;
  isDoubles?: boolean;
};

const DIE_SIZE = 25;

/** Classic pip maps for faces 1–6 (row-major 3×3). */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function clampFace(n: number): number {
  if (n < 1 || n > 6 || !Number.isFinite(n)) {
    return 1;
  }
  return Math.floor(n);
}

function DieFace({ value, size }: { value: number; size: number }) {
  const face = clampFace(value);
  const active = new Set(PIPS[face] ?? PIPS[1]);
  const gap = size * 0.14;
  const pip = Math.max(5, size * 0.14);

  return (
    <View
      style={[
        styles.die,
        {
          width: size,
          height: size,
          borderRadius: size * 0.18,
          padding: gap,
        },
      ]}
    >
      <View style={styles.pipGrid}>
        {Array.from({ length: 9 }, (_, i) => (
          <View key={i} style={styles.pipCell}>
            {active.has(i) ? (
              <View
                style={[
                  styles.pip,
                  {
                    width: pip,
                    height: pip,
                    borderRadius: pip / 2,
                  },
                ]}
              />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function TumblingDie({
  finalValue,
  rolling,
  delayMs,
}: {
  finalValue: number;
  rolling: boolean;
  delayMs: number;
}) {
  const [shown, setShown] = useState(finalValue);

  useEffect(() => {
    if (!rolling) {
      setShown(clampFace(finalValue));
      return;
    }
    setShown(1 + Math.floor(Math.random() * 6));
    const id = setInterval(() => {
      setShown(1 + Math.floor(Math.random() * 6));
    }, 70);
    return () => clearInterval(id);
  }, [rolling, finalValue]);

  return (
    <MotiView
      from={{ rotate: '0deg', scale: 0.85 }}
      animate={{
        rotate: rolling ? '360deg' : '0deg',
        scale: rolling ? 1.06 : 1,
      }}
      transition={{
        type: 'timing',
        duration: rolling ? 280 : 220,
        loop: rolling,
        delay: delayMs,
      }}
    >
      <DieFace value={shown} size={DIE_SIZE} />
    </MotiView>
  );
}

/**
 * Compact center-board dice tumble — lands on server die1/die2 (Phase 6.2b).
 */
export function DiceRollOverlay({
  visible,
  rolling,
  die1,
  die2,
  username,
  isDoubles = false,
}: DiceRollOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.root} pointerEvents="none">
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 180 }}
        style={styles.card}
      >
        {username ? (
          <Text style={styles.who} numberOfLines={1}>
            {username}
          </Text>
        ) : null}
        <View style={styles.row}>
          <TumblingDie finalValue={die1} rolling={rolling} delayMs={0} />
          <TumblingDie finalValue={die2} rolling={rolling} delayMs={40} />
        </View>
        <Text style={styles.total}>
          {rolling
            ? '…'
            : `${clampFace(die1)}+${clampFace(die2)}=${clampFace(die1) + clampFace(die2)}`}
          {!rolling && isDoubles ? ' · doubles' : ''}
        </Text>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...(StyleSheet.absoluteFill as object),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  card: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: colors.ink,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    gap: 6,
    maxWidth: '55%',
  },
  who: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.muted,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  total: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 12,
    color: colors.ink,
  },
  die: {
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pipGrid: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pipCell: {
    width: '33.333%',
    height: '33.333%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pip: {
    backgroundColor: colors.ink,
  },
});
