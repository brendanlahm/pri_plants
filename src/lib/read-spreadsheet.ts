import type { DocumentPickerAsset } from 'expo-document-picker';
import { File } from 'expo-file-system';

import { parsePlantSpreadsheet, type Plant } from '@/lib/plants';

/** The picker copies the file into the cache, so we can read it straight off disk. */
export async function readPlantsFromAsset(asset: DocumentPickerAsset): Promise<Plant[]> {
  const base64 = await new File(asset.uri).base64();
  return parsePlantSpreadsheet({ base64 });
}
