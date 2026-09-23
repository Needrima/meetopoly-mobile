import { useQuery } from '@tanstack/react-query';

import { getGame } from '@/api/services';
import type { Game } from '@/api/types';
import { queryKeys } from '@/api/queryKeys';
import { useSession } from '@/hooks/useSession';

export function useGame(gameId: string | null | undefined) {
  const { token } = useSession();
  const id = gameId?.trim() ?? '';

  return useQuery<Game, Error>({
    queryKey: queryKeys.game(id),
    enabled: Boolean(token) && id.length > 0,
    queryFn: () => getGame(id),
    staleTime: 5_000,
  });
}
