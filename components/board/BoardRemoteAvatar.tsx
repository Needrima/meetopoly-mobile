import { memo, useEffect } from 'react';

import { BoardAvatar } from '@/components/board/BoardAvatar';
import { usernameInitials } from '@/hooks/useBoardWalk';
import { useInterpolatedBoardPose } from '@/hooks/useInterpolatedBoardPose';
import { formatUsername } from '@/lib/formatUsername';
import type { PresencePose } from '@/lib/presencePose';
import type { RemotePoseRegistry } from '@/lib/remotePoseRegistry';

export type RemoteAvatarModel = {
  pose: PresencePose;
  accent: string;
  radius: number;
  /** Pixel width of the walk surface (also used as height when square). */
  boardSize: number;
  /** Pixel height when the surface is not square (hub rail). */
  boardHeight?: number;
  /** Profile photo URL when set (Phase 19.1). */
  imageUrl?: string | null;
};

/**
 * One remote presence avatar — interpolates pose on the UI thread.
 * Memoized so pin-walk Board updates do not restart interpolation.
 */
export const BoardRemoteAvatar = memo(function BoardRemoteAvatar({
  pose,
  accent,
  radius,
  boardSize,
  boardHeight,
  imageUrl = null,
}: RemoteAvatarModel) {
  const h = boardHeight ?? boardSize;
  const { poseX, poseY } = useInterpolatedBoardPose(
    pose.x,
    pose.y,
    boardSize,
    h,
  );
  const initials = usernameInitials(formatUsername(pose.username));

  return (
    <BoardAvatar
      poseX={poseX}
      poseY={poseY}
      radius={radius}
      initials={initials}
      accent={accent}
      imageUrl={imageUrl}
      zIndex={18}
    />
  );
}, posePropsEqual);

function posePropsEqual(
  prev: RemoteAvatarModel,
  next: RemoteAvatarModel,
): boolean {
  return (
    prev.accent === next.accent &&
    prev.radius === next.radius &&
    prev.boardSize === next.boardSize &&
    prev.boardHeight === next.boardHeight &&
    (prev.imageUrl ?? '') === (next.imageUrl ?? '') &&
    prev.pose.userId === next.pose.userId &&
    prev.pose.x === next.pose.x &&
    prev.pose.y === next.pose.y &&
    prev.pose.rot === next.pose.rot &&
    prev.pose.username === next.pose.username
  );
}

export type BoardRegistryRemoteAvatarModel = {
  userId: string;
  username: string;
  accent: string;
  radius: number;
  boardSize: number;
  boardHeight?: number;
  imageUrl?: string | null;
  registry: RemotePoseRegistry;
  frozenNorm?: { x: number; y: number };
};

/**
 * Phase 23.1 — board remote avatar driven by registry SharedValues (hub uses pose props until 23.2).
 */
export const BoardRegistryRemoteAvatar = memo(function BoardRegistryRemoteAvatar({
  userId,
  username,
  accent,
  radius,
  boardSize,
  boardHeight,
  imageUrl = null,
  registry,
  frozenNorm,
}: BoardRegistryRemoteAvatarModel) {
  const h = boardHeight ?? boardSize;
  const slot = registry.ensurePeer(userId);
  const initials = usernameInitials(formatUsername(username));

  useEffect(() => {
    registry.setSurface(userId, boardSize, h);
  }, [registry, userId, boardSize, h]);

  useEffect(() => {
    if (!frozenNorm) {
      return;
    }
    registry.setNormPose(userId, frozenNorm.x, frozenNorm.y);
  }, [registry, userId, frozenNorm?.x, frozenNorm?.y]);

  return (
    <BoardAvatar
      poseX={slot.poseX}
      poseY={slot.poseY}
      radius={radius}
      initials={initials}
      accent={accent}
      imageUrl={imageUrl}
      zIndex={18}
    />
  );
}, registryAvatarPropsEqual);

function registryAvatarPropsEqual(
  prev: BoardRegistryRemoteAvatarModel,
  next: BoardRegistryRemoteAvatarModel,
): boolean {
  return (
    prev.userId === next.userId &&
    prev.username === next.username &&
    prev.accent === next.accent &&
    prev.radius === next.radius &&
    prev.boardSize === next.boardSize &&
    prev.boardHeight === next.boardHeight &&
    (prev.imageUrl ?? '') === (next.imageUrl ?? '') &&
    prev.registry === next.registry &&
    prev.frozenNorm?.x === next.frozenNorm?.x &&
    prev.frozenNorm?.y === next.frozenNorm?.y
  );
}
