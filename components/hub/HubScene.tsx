import { StyleSheet, View } from 'react-native';

import { BoardAvatar } from '@/components/board/BoardAvatar';
import {
  BoardRegistryRemoteAvatar,
  BoardRemoteAvatar,
  type RemoteAvatarModel,
} from '@/components/board/BoardRemoteAvatar';
import type { HubRemoteMeta } from '@/lib/buildHubRemoteMetas';
import type { RemotePoseRegistry } from '@/lib/remotePoseRegistry';
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
    imageUrl?: string | null;
  } | null;
  /** Phase 23.2 — registry-driven remotes (preferred). */
  registryRemotes?: HubRemoteMeta[];
  poseRegistry?: RemotePoseRegistry | null;
  /** Legacy pose-prop remotes (unused when registry is set). */
  remotes?: Omit<RemoteAvatarModel, 'boardSize' | 'radius'>[];
  remoteRadius: number;
};

/**
 * Full-rail avatar layer — walk bounds match the center pane (incl. heading).
 */
export function HubScene({
  width,
  height,
  local,
  registryRemotes = [],
  poseRegistry = null,
  remotes = [],
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
      {poseRegistry && registryRemotes.length > 0
        ? registryRemotes.map((r) => (
            <BoardRegistryRemoteAvatar
              key={r.userId}
              userId={r.userId}
              username={r.username}
              accent={r.accent}
              radius={remoteRadius}
              boardSize={width}
              boardHeight={height}
              imageUrl={r.imageUrl}
              registry={poseRegistry}
            />
          ))
        : remotes.map((r) => (
            <BoardRemoteAvatar
              key={r.pose.userId}
              pose={r.pose}
              accent={r.accent}
              radius={remoteRadius}
              boardSize={width}
              boardHeight={height}
              imageUrl={r.imageUrl}
            />
          ))}
      {local ? (
        <BoardAvatar
          poseX={local.poseX}
          poseY={local.poseY}
          radius={local.radius}
          initials={local.initials}
          accent={local.accent}
          imageUrl={local.imageUrl}
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
