import { useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { GamePlayer } from '@/api/types';
import { AvatarPod } from '@/components/board/AvatarPod';
import { MeetCoinAmount } from '@/components/ui/MeetCoinAmount';
import { usernameInitials } from '@/hooks/useBoardWalk';
import { formatUsername } from '@/lib/formatUsername';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type PlayerInfoModalProps = {
  visible: boolean;
  player: GamePlayer | null;
  isLocal: boolean;
  hubCode?: string;
  onClose: () => void;
};

/**
 * Phase 16.2 — long-press seat info (name, country, MeetCoin, avatar, hub, out).
 */
export function PlayerInfoModal({
  visible,
  player,
  isLocal,
  hubCode = '',
  onClose,
}: PlayerInfoModalProps) {
  const name = useMemo(
    () => (player ? formatUsername(player.username) : ''),
    [player],
  );
  const initials = useMemo(() => usernameInitials(name), [name]);
  const country =
    typeof player?.country === "string" && player.country.trim()
      ? player.country.trim().toUpperCase()
      : '';
  const pin = player?.pinColor ?? colors.accent;

  return (
    <Modal
      visible={visible && Boolean(player)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {player ? (
            <>
              <View style={styles.avatarWrap}>
                <AvatarPod initials={initials} accent={pin} radius={28} />
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {isLocal ? 'You' : name}
              </Text>
              {isLocal && name ? (
                <Text style={styles.sub} numberOfLines={1}>
                  {name}
                </Text>
              ) : null}
              {country ? (
                <Text style={styles.meta}>{country}</Text>
              ) : null}
              {hubCode ? (
                <Text style={styles.meta}>In hub · {hubCode}</Text>
              ) : null}
              {player.resigned ? (
                <Text style={styles.out}>Out of the game</Text>
              ) : null}
              <View style={styles.cashRow}>
                <MeetCoinAmount amount={player.cash} size={20} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close player info"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeBtn,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.closeLabel}>Close</Text>
              </Pressable>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 32, 27, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 8,
  },
  avatarWrap: {
    marginBottom: 6,
  },
  name: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.brand,
    textAlign: 'center',
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  meta: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    letterSpacing: 0.4,
    color: colors.muted,
  },
  out: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.danger,
  },
  cashRow: {
    marginTop: 8,
    marginBottom: 4,
  },
  closeBtn: {
    marginTop: 8,
    minWidth: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
  },
  pressed: {
    opacity: 0.75,
  },
});
