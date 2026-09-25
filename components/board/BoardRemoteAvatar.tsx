import { memo } from 'react';

import { BoardAvatar } from '@/components/board/BoardAvatar';
import { usernameInitials } from '@/hooks/useBoardWalk';
import { useInterpolatedBoardPose } from '@/hooks/useInterpolatedBoardPose';
import { formatUsername } from '@/lib/formatUsername';
import type { PresencePose } from '@/lib/presencePose';

export type RemoteAvatarModel = {
  pose: PresencePose;
  accent: string;
  radius: number;
  /** Pixel width of the walk surface (also used as height when square). */
  boardSize: number;
  /** Pixel height when the surface is not square (hub rail). */
  boardHeight?: number;
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
    prev.pose.userId === next.pose.userId &&
    prev.pose.x === next.pose.x &&
    prev.pose.y === next.pose.y &&
    prev.pose.rot === next.pose.rot &&
    prev.pose.username === next.pose.username
  );
}
