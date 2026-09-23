import { StyleSheet, View } from 'react-native';

type BoardPinProps = {
  x: number;
  y: number;
  radius: number;
  accent: string;
};

/**
 * Phase 4.5 — game pin on a boardIndex slot (starts on GO).
 * Soft obstacle for the walking avatar. Same accent as avatar pod/callout.
 */
export function BoardPin({ x, y, radius, accent }: BoardPinProps) {
  const head = radius * 1.35;
  const stemH = radius * 1.1;
  const stemW = Math.max(3, radius * 0.28);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.root,
        {
          left: x - head / 2,
          top: y - head - stemH * 0.35,
          width: head,
          height: head + stemH,
        },
      ]}
      accessibilityLabel="Game pin on GO"
    >
      <View
        style={[
          styles.head,
          {
            width: head,
            height: head,
            borderRadius: head / 2,
            backgroundColor: accent,
          },
        ]}
      >
        <View style={styles.headDot} />
      </View>
      <View
        style={[
          styles.stem,
          {
            width: stemW,
            height: stemH,
            backgroundColor: accent,
            marginTop: -2,
          },
        ]}
      />
      <View
        style={[
          styles.base,
          {
            width: radius * 1.2,
            height: radius * 0.35,
            borderRadius: radius,
            backgroundColor: accent,
            opacity: 0.45,
            marginTop: -2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    zIndex: 15,
    alignItems: 'center',
  },
  head: {
    borderWidth: 2,
    borderColor: 'rgba(20, 32, 27, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headDot: {
    width: '38%',
    height: '38%',
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  stem: {
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  base: {},
});
