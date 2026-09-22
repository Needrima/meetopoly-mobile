export const queryKeys = {
  health: ['health'] as const,
  me: ['me'] as const,
  worlds: ['worlds'] as const,
  locations: (worldId: string) => ['locations', worldId] as const,
  location: (id: string) => ['location', id] as const,
  locationBySlug: (worldId: string, slug: string) =>
    ['location', 'by-slug', worldId, slug] as const,
};
