import type { Plant } from '@/lib/plants';

/** How much light a plant will accept. A plant usually tolerates more than one. */
export type LightLevel = 'direct' | 'bright' | 'low' | 'shade';

/** Brightest first. The order is what lets a range fill in the levels it spans. */
export const LIGHT_LEVELS: LightLevel[] = ['direct', 'bright', 'low', 'shade'];

export const LIGHT_LABELS: Record<LightLevel, string> = {
  direct: 'Full sun',
  bright: 'Bright indirect',
  low: 'Low light',
  shade: 'Shade',
};

/** `all` is the unfiltered state; the rest are the light levels. */
export type LightFilter = 'all' | LightLevel;

export const LIGHT_FILTERS: LightFilter[] = ['all', ...LIGHT_LEVELS];

export const LIGHT_FILTER_LABELS: Record<LightFilter, string> = {
  all: 'Any light',
  ...LIGHT_LABELS,
};

/**
 * Phrases that rule light out rather than in. "Bright indirect light, no direct
 * sun" would otherwise read as full sun, which is the opposite of what it says,
 * so these are cut from the text before anything is matched.
 */
const NEGATIONS =
  /\b(?:no|not|never|avoid|without|keep\s+out\s+of|away\s+from)\s+(?:any\s+|too\s+much\s+)?(?:direct|full|harsh|hot|midday|afternoon)\s*(?:sun\w*|light)?/gi;

/**
 * `indirect` contains `direct`, so every pattern here is anchored on word
 * boundaries: \bdirect\b does not match "indirect".
 */
const PATTERNS: Record<LightLevel, RegExp> = {
  direct: /\b(?:full\s+sun\w*|direct\s+sun\w*|direct\s+light|full\s+light|direct)\b/i,
  bright: /\b(?:bright\w*|indirect|medium|filtered|dappled)\b/i,
  low: /\b(?:low|dim)\b/i,
  shade: /\b(?:shade|shady|shaded|dark)\b/i,
};

/** Every light level the text says the plant will accept. */
export function lightLevelsFromText(text: string | undefined): LightLevel[] {
  if (!text) return [];
  const cleaned = text.replace(NEGATIONS, ' ');
  const matched = LIGHT_LEVELS.filter((level) => PATTERNS[level].test(cleaned));
  if (matched.length < 2) return matched;

  // A range covers what it spans: "full sun to partial shade" never says bright,
  // but a plant happy at both ends plainly accepts everything in between.
  const first = LIGHT_LEVELS.indexOf(matched[0]);
  const last = LIGHT_LEVELS.indexOf(matched[matched.length - 1]);
  return LIGHT_LEVELS.slice(first, last + 1);
}

/**
 * The text describing a plant's light.
 *
 * Falls back to unrecognised columns because sheets label this all sorts of
 * ways — "Placement" holds it in some — and the words used for light (sun,
 * shade, bright, indirect) are distinctive enough that a column about something
 * else will not classify.
 */
export function plantLightText(plant: Plant): string | undefined {
  if (plant.light) return plant.light;
  return Object.values(plant.extra).find((value) => lightLevelsFromText(value).length > 0);
}

export function plantLightLevels(plant: Plant): LightLevel[] {
  return lightLevelsFromText(plantLightText(plant));
}

/** Plants that will accept the given level; `null` keeps everything. */
export function filterByLight(plants: Plant[], level: LightLevel | null): Plant[] {
  if (!level) return plants;
  return plants.filter((plant) => plantLightLevels(plant).includes(level));
}

/**
 * The heading an existing list uses for light, when it keeps it in an
 * unrecognised column. `null` means the list uses the canonical `light` field,
 * or has nothing to go on.
 */
export function lightHeaderIn(plants: Plant[]): string | null {
  for (const plant of plants) {
    if (plant.light) return null;
    const entry = Object.entries(plant.extra).find(
      ([, value]) => lightLevelsFromText(value).length > 0
    );
    if (entry) return entry[0];
  }
  return null;
}

/** The levels some plant in this list actually accepts, brightest first. */
export function lightLevelsInUse(plants: Plant[]): LightLevel[] {
  const seen = new Set<LightLevel>();
  for (const plant of plants) for (const level of plantLightLevels(plant)) seen.add(level);
  return LIGHT_LEVELS.filter((level) => seen.has(level));
}
