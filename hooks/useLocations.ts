import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { getLocationById, getLocationBySlug, listLocations, listWorlds } from '@/api/services';
import type { Location, LocationsResponse, WorldsResponse } from '@/api/types';

const DEFAULT_WORLD_ID = 'africa-1';

export function useLocations(worldId: string = DEFAULT_WORLD_ID) {
  const id = worldId.trim();
  return useQuery<LocationsResponse, Error>({
    queryKey: queryKeys.locations(id),
    queryFn: () => listLocations({ worldId: id }),
    enabled: id.length > 0,
  });
}

export function useWorlds() {
  return useQuery<WorldsResponse, Error>({
    queryKey: queryKeys.worlds,
    queryFn: () => listWorlds(),
  });
}

export function useLocationById(locationId: string | undefined) {
  const id = locationId?.trim() ?? '';
  return useQuery<Location, Error>({
    queryKey: queryKeys.location(id),
    queryFn: () => getLocationById(id),
    enabled: id.length > 0,
  });
}

export function useLocationBySlug(worldId: string, slug: string) {
  const w = worldId.trim();
  const s = slug.trim();
  return useQuery<Location, Error>({
    queryKey: queryKeys.locationBySlug(w, s),
    queryFn: () => getLocationBySlug({ worldId: w, slug: s }),
    enabled: w.length > 0 && s.length > 0,
  });
}

export { DEFAULT_WORLD_ID };
