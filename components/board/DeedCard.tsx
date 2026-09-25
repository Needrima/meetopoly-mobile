import { StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import type { Location } from '@/api/types';
import {
  isLightHex,
  kindFallbackLabel,
  rentRowsFor,
  stripColorFor,
  stripWorldNamePrefix,
} from '@/components/board/deedVisual';
import type { BoardIcon } from '@/components/board/iconRegistry';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type DeedCardProps = {
  /** Display name (world pack prefix stripped for buyable titles). */
  name: string;
  kind: string;
  location?: Location | null;
  /** Board icon component from `resolveBoardIcon`. */
  Icon?: BoardIcon | null;
  /** Stagger Moti entrance (header → body). */
  animate?: boolean;
};

/**
 * Shared branded deed face (Phase 9.1) — color strip + rent grid.
 * Used by buy overlay and tile-info inspect.
 */
export function DeedCard({
  name,
  kind,
  location = null,
  Icon = null,
  animate = true,
}: DeedCardProps) {
  const strip = stripColorFor(location, kind);
  const onStrip = isLightHex(strip) ? colors.ink : colors.onBrand;
  const rows = rentRowsFor(kind, location);
  const title = stripWorldNamePrefix(name);

  const header = (
    <View style={[styles.header, { backgroundColor: strip }]}>
      {Icon ? (
        <View style={styles.iconWrap}>
          <Icon width={28} height={28} color={onStrip} />
        </View>
      ) : null}
      <Text style={[styles.name, { color: onStrip }]} numberOfLines={2}>
        {title}
      </Text>
    </View>
  );

  const body = (
    <View style={styles.body}>
      {rows.length > 0 ? (
        <View style={styles.rentGrid}>
          {rows.map((row) => (
            <View key={row.label} style={styles.rentCell}>
              <Text style={styles.rentLabel} numberOfLines={1}>
                {row.label}
              </Text>
              <Text style={styles.rentValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.kindFallback}>{kindFallbackLabel(kind)}</Text>
      )}
    </View>
  );

  if (!animate) {
    return (
      <View style={[styles.card, { borderColor: strip }]}>
        {header}
        {body}
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: strip }]}>
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 200 }}
      >
        {header}
      </MotiView>
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 220, delay: 70 }}
      >
        {body}
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2.5,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 56,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    lineHeight: 26,
    includeFontPadding: false,
    textAlignVertical: 'center',
    flexShrink: 1,
    textAlign: 'center',
  },
  body: {
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(20,32,27,0.08)',
  },
  rentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rentCell: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rentLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    flexShrink: 1,
    marginRight: 6,
  },
  rentValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.ink,
  },
  kindFallback: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 6,
  },
});
