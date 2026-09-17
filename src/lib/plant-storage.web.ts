import type { PlantLibrary } from '@/lib/plant-library';
import { emptyLibrary, parseLibrary } from '@/lib/plant-library';

/** expo-file-system's File API is native-only, so the web build uses localStorage. */
const STORAGE_KEY = 'pri_plants.library';

export async function loadLibrary(): Promise<PlantLibrary> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseLibrary(JSON.parse(stored)) : emptyLibrary();
  } catch {
    return emptyLibrary();
  }
}

export async function saveLibrary(library: PlantLibrary) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  } catch {
    // Private browsing or a full quota — the list still works for this session.
  }
}
