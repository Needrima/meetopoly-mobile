import { ScrollView, StyleSheet, Text, View, type ReactNode } from 'react-native';

import type { PresenceRosterEntry } from '@/hooks/useBoardPresence';
import { formatUsername } from '@/lib/formatUsername';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

export type HubRosterRow = PresenceRosterEntry & {
  accent: string;
  isLocal?: boolean;
};

type HubRosterProps = {
  rows: HubRosterRow[];
  maxPeers?: number;
  /** Leave control (top-right of this rail). */
  headerRight?: ReactNode;
};

/**
 * Phase 9.0d — right-rail hub roster: IN HUB count + 2 per row.
 * Local: `You · NG`. Remotes: `Name · NG`.
 * Pairs use space-between so left/right edge padding matches the panel.
 */
export function HubRoster({
  rows,
  maxPeers = 16,
  headerRight,
}: HubRosterProps) {
  const shown = rows.slice(0, maxPeers);
  const pairs: HubRosterRow[][] = [];
  for (let i = 0; i < shown.length; i += 2) {
    pairs.push(shown.slice(i, i + 2));
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          In hub · {shown.length}/{maxPeers}
        </Text>
        {headerRight}
      </View>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {shown.length === 0 ? (
          <Text style={styles.empty}>Just you for now</Text>
        ) : (
          <View style={styles.pairs}>
            {pairs.map((pair) => (
              <View
                key={pair.map((r) => r.userId).join('-')}
                style={styles.pairRow}
              >
                {pair.map((row) => {
                  const country =
                    typeof row.country === 'string' && row.country.trim()
                      ? row.country.trim().toUpperCase()
                      : '';
                  const who = row.isLocal
                    ? 'You'
                    : formatUsername(row.username) || 'Player';
                  const label = country ? `${who} · ${country}` : who;
                  return (
                    <View key={row.userId} style={styles.chip}>
                      <View
                        style={[styles.dot, { backgroundColor: row.accent }]}
                      />
                      <Text style={styles.label} numberOfLines={1}>
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  eyebrow: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 4,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  pairs: {
    gap: 2,
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '48%',
    minWidth: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  label: {
    flexShrink: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
});
