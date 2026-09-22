import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { getHealth } from "@/api/services";
import type { HealthResponse } from "@/api/types";

export function useHealth() {
  return useQuery<HealthResponse, Error>({
    queryKey: queryKeys.health,
    queryFn: () => getHealth(),
    refetchInterval: 10_000,
  });
}
