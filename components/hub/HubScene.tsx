import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { BoardAvatar } from '@/components/board/BoardAvatar';
import {
  BoardRegistryRemoteAvatar,
  BoardRemoteAvatar,
  type RemoteAvatarModel,
} from '@/components/board/BoardRemoteAvatar';
import type { HubRemoteMeta } from '@/lib/buildHubRemoteMetas';
import type { RemotePoseRegistry } from '@/lib/remotePoseRegistry';

export type HubLocalAvatarProps = {
  poseX: SharedValue<number>;
  poseY: SharedValue<number>;
  radius: number;
  initials: string;
  accent: string;
  imageUrl?: string | null;
};

type HubSceneProps = {
  width: number;
  height: number;
  local: HubLocalAvatarProps | null;
  /** Phase 23.2 — registry-driven remotes (preferred). */
  registryRemotes?: HubRemoteMeta[];
  poseRegistry?: RemotePoseRegistry | null;
  /** Legacy pose-prop remotes (unused when registry is set). */
  remotes?: Omit<RemoteAvatarModel, 'boardSize' | 'radius'>[];
  remoteRadius: number;
};

/**
 * Full-rail avatar layer — walk bounds match the center pane (incl. heading).
 * Phase 23.4 — memoized so hub UI ticks do not remount avatars.
 */
export const HubScene = memo(function HubScene({
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
}, hubSceneEqual);

function hubSceneEqual(prev: HubSceneProps, next: HubSceneProps): boolean {
  if (
    prev.width !== next.width ||
    prev.height !== next.height ||
    prev.remoteRadius !== next.remoteRadius ||
    prev.poseRegistry !== next.poseRegistry
  ) {
    return false;
  }
  if (!hubRemotesEqual(prev.registryRemotes ?? [], next.registryRemotes ?? [])) {
    return false;
  }
  if (!hubLocalEqual(prev.local, next.local)) {
    return false;
  }
  if (prev.poseRegistry) {
    return true;
  }
  return prev.remotes === next.remotes;
}

function hubRemotesEqual(a: HubRemoteMeta[], b: HubRemoteMeta[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (
      x.userId !== y.userId ||
      x.username !== y.username ||
      x.accent !== y.accent ||
      (x.imageUrl ?? '') !== (y.imageUrl ?? '')
    ) {
      return false;
    }
  }
  return true;
}

function hubLocalEqual(
  a: HubLocalAvatarProps | null,
  b: HubLocalAvatarProps | null,
): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return (
    a.poseX === b.poseX &&
    a.poseY === b.poseY &&
    a.radius === b.radius &&
    a.initials === b.initials &&
    a.accent === b.accent &&
    (a.imageUrl ?? '') === (b.imageUrl ?? '')
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 1,
    overflow: 'visible',
  },
});
