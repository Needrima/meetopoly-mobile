import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/** About Meetopoly — product blurb + icon attribution. */
export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
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
        <Text style={styles.title}>About Meetopoly</Text>
      </View>
      <Text style={styles.body}>
        A live, worldwide social property game. Walk the board, enter city hubs,
        and play with friends around a Monopoly-style ring — original chrome, not
        Hasbro art.
      </Text>
      <Text style={styles.section}>City icons</Text>
      <Text style={styles.body}>
        Minimalist city icons by Studio Partdirector (SVGCities), licensed under
        Creative Commons Attribution 4.0. See svgcities.com/license.
      </Text>
      <Text style={styles.section}>Generic board icons</Text>
      <Text style={styles.body}>
        Airport and utility glyphs (plane, bolt, droplet, and specials) from
        Tabler Icons (MIT).
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  back: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.brand,
  },
  section: {
    marginTop: 20,
    marginBottom: 6,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
    maxWidth: 520,
  },
  pressed: {
    opacity: 0.75,
  },
});
