import Svg, { Line, Text as SvgText } from 'react-native-svg';

import { colors } from '@/theme/colors';

type MeetCoinSymbolProps = {
  size?: number;
  color?: string;
};

/**
 * MeetCoin mark: capital M with two horizontal bars (₦ / ₩ family).
 */
export function MeetCoinSymbol({
  size = 16,
  color = colors.ink,
}: MeetCoinSymbolProps) {
  const stroke = Math.max(1.5, size * 0.12);
  const barY1 = size * 0.42;
  const barY2 = size * 0.62;
  const barInset = size * 0.18;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <SvgText
        x={size / 2}
        y={size * 0.78}
        fill={color}
        fontSize={size * 0.85}
        fontWeight="700"
        textAnchor="middle"
      >
        M
      </SvgText>
      <Line
        x1={barInset}
        y1={barY1}
        x2={size - barInset}
        y2={barY1}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <Line
        x1={barInset}
        y1={barY2}
        x2={size - barInset}
        y2={barY2}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </Svg>
  );
}
