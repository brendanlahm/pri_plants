import type { Plant } from '@/lib/plants';

/** The imported list, plus where it came from. */
export type PlantLibrary = {
  plants: Plant[];
  /** Name of the spreadsheet it was imported from, or null if nothing is imported. */
  fileName: string | null;
  /** ISO timestamp of the import. */
  importedAt: string | null;
};

export function emptyLibrary(): PlantLibrary {
  return { plants: [], fileName: null, importedAt: null };
}

/** Accepts whatever was on disk and returns something the UI can safely render. */
export function parseLibrary(value: unknown): PlantLibrary {
  if (!value || typeof value !== 'object') return emptyLibrary();
  const { plants, fileName, importedAt } = value as Partial<PlantLibrary>;
  if (!Array.isArray(plants)) return emptyLibrary();
  return {
    plants: plants.filter((plant) => plant && typeof plant.name === 'string'),
    fileName: typeof fileName === 'string' ? fileName : null,
    importedAt: typeof importedAt === 'string' ? importedAt : null,
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
