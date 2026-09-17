import * as DocumentPicker from 'expo-document-picker';

import { PlantImportError, type Plant } from '@/lib/plants';
import { readPlantsFromAsset } from '@/lib/read-spreadsheet';

/** Extensions we know the parser handles — used for error wording, not for filtering. */
const SPREADSHEET_EXTENSIONS = ['xlsx', 'xlsm', 'xls', 'csv', 'ods'];

function looksLikeSpreadsheet(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return SPREADSHEET_EXTENSIONS.includes(extension);
}

export type ImportResult =
  | { status: 'canceled' }
  | { status: 'imported'; plants: Plant[]; fileName: string }
  | { status: 'failed'; message: string };

/** Asks for a spreadsheet and turns it into plants. Never throws — errors come back as a message. */
export async function importPlantsFromSpreadsheet(): Promise<ImportResult> {
  let asset: DocumentPicker.DocumentPickerAsset;
  try {
    const result = await DocumentPicker.getDocumentAsync({
      // Deliberately unfiltered. Android greys out any file whose provider reports a
      // MIME type outside this list, and providers routinely report a downloaded .xlsx
      // as application/octet-stream — so a filter here silently blocks valid files.
      // We check the file by parsing it instead.
      type: '*/*',
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return { status: 'canceled' };
    asset = result.assets[0];
  } catch {
    return { status: 'failed', message: "The file picker couldn't be opened." };
  }

  try {
    const plants = await readPlantsFromAsset(asset);
    return { status: 'imported', plants, fileName: asset.name };
  } catch (error) {
    if (!looksLikeSpreadsheet(asset.name)) {
      return {
        status: 'failed',
        message: `${asset.name} isn't a spreadsheet. Pick an .xlsx, .xls or .csv file.`,
      };
    }
    return {
      status: 'failed',
      message:
        error instanceof PlantImportError
          ? error.message
          : `${asset.name} couldn't be read. It may be password protected or damaged.`,
    };
  }
}
