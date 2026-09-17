import { File, Paths } from 'expo-file-system';

import type { PlantLibrary } from '@/lib/plant-library';
import { emptyLibrary, parseLibrary } from '@/lib/plant-library';

/** Where the imported list lives between app launches. */
function libraryFile() {
  return new File(Paths.document, 'plants.json');
}

export async function loadLibrary(): Promise<PlantLibrary> {
  const file = libraryFile();
  if (!file.exists) return emptyLibrary();
  try {
    return parseLibrary(JSON.parse(await file.text()));
  } catch {
    return emptyLibrary();
  }
}

export async function saveLibrary(library: PlantLibrary) {
  const file = libraryFile();
  if (!file.exists) file.create({ intermediates: true });
  file.write(JSON.stringify(library));
}
