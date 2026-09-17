import { lightHeaderIn } from '@/lib/light';
import { headerMatchesField, type Plant } from '@/lib/plants';
import { careIntervalDays } from '@/lib/care-interval';
import type { CareAnchors } from '@/lib/care-schedule';

/** The imported list, plus where it came from. */
export type PlantLibrary = {
  plants: Plant[];
  /** Name of the spreadsheet it was imported from, or null if nothing is imported. */
  fileName: string | null;
  /** ISO timestamp of the import. */
  importedAt: string | null;
  /** When everything was last watered and fertilized; drives the calendar. */
  careAnchors: CareAnchors | null;
};

export function emptyLibrary(): PlantLibrary {
  return { plants: [], fileName: null, importedAt: null, careAnchors: null };
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function parseAnchors(value: unknown): CareAnchors | null {
  if (!value || typeof value !== 'object') return null;
  const { wateredAt, fertilizedAt } = value as Partial<CareAnchors>;
  if (typeof wateredAt !== 'string' || !DATE_KEY.test(wateredAt)) return null;
  if (typeof fertilizedAt !== 'string' || !DATE_KEY.test(fertilizedAt)) return null;
  return { wateredAt, fertilizedAt };
}

/** Accepts whatever was on disk and returns something the UI can safely render. */
export function parseLibrary(value: unknown): PlantLibrary {
  if (!value || typeof value !== 'object') return emptyLibrary();
  const { plants, fileName, importedAt, careAnchors } = value as Partial<PlantLibrary>;
  if (!Array.isArray(plants)) return emptyLibrary();
  return {
    plants: plants.filter((plant) => plant && typeof plant.name === 'string'),
    fileName: typeof fileName === 'string' ? fileName : null,
    importedAt: typeof importedAt === 'string' ? importedAt : null,
    careAnchors: parseAnchors(careAnchors),
  };
}

/** Case-insensitive search across every value on a plant, including extra columns. */
export function filterPlants(plants: Plant[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return plants;
  return plants.filter((plant) =>
    [plant.name, plant.species, plant.location, plant.watering, plant.light, plant.acquired, plant.notes]
      .concat(Object.values(plant.extra))
      .some((value) => value?.toLowerCase().includes(needle))
  );
}

/** How the list is ordered. `sheet` keeps the spreadsheet's own row order. */
export type SortMode = 'sheet' | 'wateringOften' | 'wateringRarely';

export const SORT_LABELS: Record<SortMode, string> = {
  sheet: 'Sheet order',
  wateringOften: 'Watered often',
  wateringRarely: 'Watered rarely',
};

/**
 * Orders the list without mutating it. Plants whose watering column says nothing
 * readable keep their sheet order at the end, rather than being scattered through
 * a list they cannot meaningfully take part in.
 */
export function sortPlants(plants: Plant[], mode: SortMode): Plant[] {
  if (mode === 'sheet') return plants;

  const sheetOrder = new Map(plants.map((plant, index) => [plant.id, index]));
  const intervals = new Map(plants.map((plant) => [plant.id, careIntervalDays(plant.watering)]));
  const direction = mode === 'wateringOften' ? 1 : -1;

  return [...plants].sort((a, b) => {
    const left = intervals.get(a.id);
    const right = intervals.get(b.id);
    if (left === undefined || right === undefined) {
      if (left !== undefined) return -1;
      if (right !== undefined) return 1;
    } else if (left !== right) {
      return (left - right) * direction;
    }
    return sheetOrder.get(a.id)! - sheetOrder.get(b.id)!;
  });
}

/** The four things the add form asks for. */
export type PlantDraft = {
  name: string;
  watering: string;
  fertilizing: string;
  light: string;
};

/**
 * The heading an existing list uses for a field it keeps in an unrecognised
 * column, so an added plant reads the same as the imported ones rather than
 * sprouting a second label for the same thing.
 */
function existingHeaderFor(plants: Plant[], field: 'fertilizing' | 'light') {
  if (field === 'light') return lightHeaderIn(plants);
  for (const plant of plants) {
    if (plant[field]) return null;
    const header = Object.keys(plant.extra).find((key) => headerMatchesField(key, field));
    if (header) return header;
  }
  return null;
}

/** Builds a plant from the add form, matching however the rest of the list is shaped. */
export function plantFromDraft(existing: Plant[], draft: PlantDraft): Plant {
  const plant: Plant = {
    // Hand-added ids must not collide with the row-derived ids of imported plants.
    id: `hand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: draft.name.trim(),
    extra: {},
    addedByHand: true,
  };

  const watering = draft.watering.trim();
  if (watering) plant.watering = watering;

  for (const field of ['fertilizing', 'light'] as const) {
    const value = draft[field].trim();
    if (!value) continue;
    const header = existingHeaderFor(existing, field);
    if (header) plant.extra[header] = value;
    else plant[field] = value;
  }

  return plant;
}
