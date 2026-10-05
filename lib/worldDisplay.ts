import type { ImageSourcePropType } from 'react-native';

/** Region packs that only have one board — drop the `-N` suffix in the UI label. */
const SINGLETON_REGIONS = new Set([
  'africa',
  'central-america',
  'middle-east',
  'north-america',
  'oceania',
  'south-america',
]);

const WORLD_IMAGES: Record<string, ImageSourcePropType> = {
  africa: require('../assets/worlds/africa.png'),
  asia: require('../assets/worlds/asia.png'),
  'central-america': require('../assets/worlds/central-america.png'),
  europe: require('../assets/worlds/europe.png'),
  'middle-east': require('../assets/worlds/middle-east.png'),
  'north-america': require('../assets/worlds/north-america.png'),
  oceania: require('../assets/worlds/oceania.png'),
  'south-america': require('../assets/worlds/south-america.png'),
};

function parseWorldId(worldId: string): { region: string; pack: string | null } {
  const match = /^(.+)-(\d+)$/.exec(worldId.trim());
  if (!match) {
    return { region: worldId.trim(), pack: null };
  }
  return { region: match[1], pack: match[2] };
}

function titleCaseRegion(region: string): string {
  return region
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Derive a human label from API `worldId` (e.g. `europe-3` → `Europe 3`). */
export function formatWorldLabel(worldId: string): string {
  const { region, pack } = parseWorldId(worldId);
  const title = titleCaseRegion(region);
  if (!pack || SINGLETON_REGIONS.has(region)) {
    return title;
  }
  return `${title} ${pack}`;
}

/** Map image for a world pack — multi-pack regions share one PNG. */
export function resolveWorldImage(
  worldId: string,
): ImageSourcePropType | undefined {
  const { region } = parseWorldId(worldId);
  return WORLD_IMAGES[region];
}
