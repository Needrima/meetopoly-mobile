import { StyleSheet, Text, View } from 'react-native';

import { MeetCoinSymbol } from '@/components/ui/MeetCoinSymbol';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type MeetCoinAmountProps = {
  amount: number;
  size?: number;
  color?: string;
};

/** Renders `[MeetCoin symbol] 2000`. */
export function MeetCoinAmount({
  amount,
  size = 16,
  color = colors.ink,
}: MeetCoinAmountProps) {
  return (
    <View style={styles.row}>
      <MeetCoinSymbol size={size} color={color} />
      <Text style={[styles.amount, { fontSize: size, color, lineHeight: size + 2 }]}>
        {amount.toLocaleString('en-US')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amount: {
    fontFamily: fonts.bodySemiBold,
  },
});
