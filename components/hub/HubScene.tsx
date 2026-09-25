import { StyleSheet, View } from 'react-native';

import { BoardAvatar } from '@/components/board/BoardAvatar';
import {
  BoardRemoteAvatar,
  type RemoteAvatarModel,
} from '@/components/board/BoardRemoteAvatar';
import type { SharedValue } from 'react-native-reanimated';

type HubSceneProps = {
  width: number;
  height: number;
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
 * Full-rail avatar layer — walk bounds match the center pane (incl. heading).
 */
export function HubScene({
  width,
  height,
  local,
  remotes,
  remoteRadius,
}: HubSceneProps) {
  if (width <= 0 || height <= 0) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.root, { width, height }]}
    >
      {remotes.map((r) => (
        <BoardRemoteAvatar
          key={r.pose.userId}
          pose={r.pose}
          accent={r.accent}
          radius={remoteRadius}
          boardSize={width}
          boardHeight={height}
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
    zIndex: 1,
    overflow: 'visible',
  },
});
