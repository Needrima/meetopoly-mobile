import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getGame, rollDice } from '@/api/services';
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
    staleTime: 1_000,
    refetchInterval: 2_000,
  });
}

export function useRollDice(gameId: string | null | undefined) {
  const queryClient = useQueryClient();
  const id = gameId?.trim() ?? '';

  return useMutation<Game, Error, void>({
    mutationFn: () => rollDice(id),
    onSuccess: (game) => {
      queryClient.setQueryData(queryKeys.game(id), game);
    },
  });
}
