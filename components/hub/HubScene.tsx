import { StyleSheet, View } from 'react-native';

import { BoardAvatar } from '@/components/board/BoardAvatar';
import {
  BoardRemoteAvatar,
  type RemoteAvatarModel,
} from '@/components/board/BoardRemoteAvatar';
import type { SharedValue } from 'react-native-reanimated';
import { colors } from '@/theme/colors';

type HubSceneProps = {
  size: number;
  local: {
    poseX: SharedValue<number>;
    poseY: SharedValue<number>;
    radius: number;
    initials: string;
    accent: string;
  } | null;
  remotes: Omit<RemoteAvatarModel, 'boardSize' | 'radius'>[];
  remoteRadius: number;
};

/**
 * Phase 8.1 — minimal walkable hub surface (local + remote avatars).
 */
export function HubScene({
  size,
  local,
  remotes,
  remoteRadius,
}: HubSceneProps) {
  if (size <= 0) {
    return null;
  }

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <View style={styles.floor} />
      <View style={styles.wall} />
      {remotes.map((r) => (
        <BoardRemoteAvatar
          key={r.pose.userId}
          pose={r.pose}
          accent={r.accent}
          radius={remoteRadius}
          boardSize={size}
        />
      ))}
      {local ? (
        <BoardAvatar
          poseX={local.poseX}
          poseY={local.poseY}
          radius={local.radius}
          initials={local.initials}
          accent={local.accent}
          zIndex={20}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  floor: {
    ...StyleSheet.absoluteFill,
    top: '48%',
    backgroundColor: '#d4c4a8',
  },
  wall: {
    ...StyleSheet.absoluteFill,
    bottom: '52%',
    backgroundColor: '#e7efe9',
  },
});
