import type { DocumentPickerAsset } from 'expo-document-picker';

import { parsePlantSpreadsheet, type Plant } from '@/lib/plants';

/** On web the picker hands back a DOM `File`, so read the bytes from it directly. */
export async function readPlantsFromAsset(asset: DocumentPickerAsset): Promise<Plant[]> {
  if (asset.file) return parsePlantSpreadsheet({ data: await asset.file.arrayBuffer() });

  const response = await fetch(asset.uri);
  return parsePlantSpreadsheet({ data: await response.arrayBuffer() });
}
