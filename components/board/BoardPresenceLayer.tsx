import { memo } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import { BoardAvatar } from '@/components/board/BoardAvatar';
import { BoardRegistryRemoteAvatar } from '@/components/board/BoardRemoteAvatar';
import type { BoardRemoteMeta } from '@/lib/buildBoardRemoteMetas';
import type { RemotePoseRegistry } from '@/lib/remotePoseRegistry';

export type BoardLocalAvatarProps = {
  poseX: SharedValue<number>;
  poseY: SharedValue<number>;
  radius: number;
  initials: string;
  accent: string;
  imageUrl?: string | null;
};

type BoardPresenceLayerProps = {
  boardSize: number;
  remoteRadius: number;
  poseRegistry: RemotePoseRegistry | null;
  registryRemotes: BoardRemoteMeta[];
  localAvatar: BoardLocalAvatarProps | null;
};

/**
 * Phase 23.4 — local + remote presence avatars isolated from pin/tile/deed updates.
 */
export const BoardPresenceLayer = memo(function BoardPresenceLayer({
  boardSize,
  remoteRadius,
  poseRegistry,
  registryRemotes,
  localAvatar,
}: BoardPresenceLayerProps) {
  if (boardSize <= 0) {
    return null;
  }

  return (
    <>
      {poseRegistry && registryRemotes.length > 0
        ? registryRemotes.map((r) => (
            <BoardRegistryRemoteAvatar
              key={r.userId}
              userId={r.userId}
              username={r.username}
              accent={r.accent}
              radius={remoteRadius}
              boardSize={boardSize}
              imageUrl={r.imageUrl}
              registry={poseRegistry}
              frozenNorm={r.frozenNorm}
            />
          ))
        : null}
      {localAvatar ? (
        <BoardAvatar
          poseX={localAvatar.poseX}
          poseY={localAvatar.poseY}
          radius={localAvatar.radius}
          initials={localAvatar.initials}
          accent={localAvatar.accent}
          imageUrl={localAvatar.imageUrl}
        />
      ) : null}
    </>
  );
}, boardPresenceLayerEqual);

function boardPresenceLayerEqual(
  prev: BoardPresenceLayerProps,
  next: BoardPresenceLayerProps,
): boolean {
  if (
    prev.boardSize !== next.boardSize ||
    prev.remoteRadius !== next.remoteRadius ||
    prev.poseRegistry !== next.poseRegistry
  ) {
    return false;
  }
  if (!registryRemotesEqual(prev.registryRemotes, next.registryRemotes)) {
    return false;
  }
  return localAvatarEqual(prev.localAvatar, next.localAvatar);
}

function registryRemotesEqual(
  a: BoardRemoteMeta[],
  b: BoardRemoteMeta[],
): boolean {
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
      (x.imageUrl ?? '') !== (y.imageUrl ?? '') ||
      x.frozenNorm?.x !== y.frozenNorm?.x ||
      x.frozenNorm?.y !== y.frozenNorm?.y
    ) {
      return false;
    }
  }
  return true;
}

function localAvatarEqual(
  a: BoardLocalAvatarProps | null,
  b: BoardLocalAvatarProps | null,
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
