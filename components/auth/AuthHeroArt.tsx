import { MotiView } from 'moti';
import LottieView from 'lottie-react-native';
import { StyleSheet, View } from 'react-native';

import Cairo from '@/city-icons/icons/eg-cairo.svg';
import Nairobi from '@/city-icons/icons/ke-nairobi.svg';
import Marrakesh from '@/city-icons/icons/ma-marrakesh.svg';
import Lagos from '@/city-icons/icons/ng-lagos.svg';
import CapeTown from '@/city-icons/icons/za-cape-town.svg';
import { colorGroups, colors } from '@/theme/colors';

type FloatingCity = {
  Icon: typeof Lagos;
  color: string;
  size: number;
  top: number;
  left: number;
  delay: number;
  drift: number;
};

const CITIES: FloatingCity[] = [
  { Icon: Lagos, color: colorGroups.green, size: 72, top: 8, left: 18, delay: 0, drift: 10 },
  { Icon: Cairo, color: colorGroups.orange, size: 64, top: 56, left: 120, delay: 120, drift: 14 },
  { Icon: Nairobi, color: colorGroups.yellow, size: 58, top: 120, left: 36, delay: 240, drift: 12 },
  { Icon: CapeTown, color: colorGroups.lightBlue, size: 66, top: 28, left: 200, delay: 80, drift: 11 },
  { Icon: Marrakesh, color: colorGroups.pink, size: 54, top: 140, left: 170, delay: 200, drift: 13 },
];

/**
 * Sunny-paper hero motion: Lottie sun + drifting city SVGs (SVGCities).
 */
export function AuthHeroArt() {
  return (
    <View style={styles.stage} pointerEvents="none">
      <View style={styles.sunWrap}>
        <LottieView
          source={require('@/assets/lottie/sunny-afternoon.json')}
          autoPlay
          loop
          style={styles.lottie}
        />
      </View>

      {CITIES.map(({ Icon, color, size, top, left, delay, drift }) => (
        <MotiView
          key={`${top}-${left}`}
          from={{ opacity: 0.5, translateY: 0 }}
          animate={{
            opacity: 0.95,
            translateY: [0, -drift],
          }}
          transition={{
            type: 'timing',
            duration: 2800 + delay,
            loop: true,
            repeatReverse: true,
            delay,
          }}
          style={[styles.city, { top, left, width: size, height: size }]}
        >
          <View style={[styles.cityShadow, { width: size * 0.7, marginLeft: size * 0.15 }]} />
          <Icon width={size} height={size} color={color} />
        </MotiView>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    height: 210,
    width: '100%',
    maxWidth: 300,
    marginTop: 12,
  },
  sunWrap: {
    position: 'absolute',
    top: -8,
    right: 8,
    width: 120,
    height: 120,
    opacity: 0.9,
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  city: {
    position: 'absolute',
    alignItems: 'center',
  },
  cityShadow: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.ink,
    opacity: 0.08,
    marginBottom: 2,
  },
});
