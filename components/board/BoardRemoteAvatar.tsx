import { BoardAvatar } from '@/components/board/BoardAvatar';
import { usernameInitials } from '@/hooks/useBoardWalk';
import { useInterpolatedBoardPose } from '@/hooks/useInterpolatedBoardPose';
import { formatUsername } from '@/lib/formatUsername';
import type { PresencePose } from '@/lib/presencePose';

export type RemoteAvatarModel = {
  pose: PresencePose;
  accent: string;
  radius: number;
  boardSize: number;
};

/**
 * One remote presence avatar — interpolates pose on the UI thread.
 */
export function BoardRemoteAvatar({
  pose,
  accent,
  radius,
  boardSize,
}: RemoteAvatarModel) {
  const { poseX, poseY } = useInterpolatedBoardPose(pose.x, pose.y, boardSize);
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
}
