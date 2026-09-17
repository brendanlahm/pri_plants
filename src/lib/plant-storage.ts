import { File, Paths } from 'expo-file-system';

import type { PlantLibrary } from '@/lib/plant-library';
import { emptyLibrary, parseLibrary } from '@/lib/plant-library';
import { parseReminderSettings, type ReminderSettings } from '@/lib/reminder-settings';

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

/** Reminder preferences live apart from the imported list; clearing one should not lose the other. */
function settingsFile() {
  return new File(Paths.document, 'reminders.json');
}

export async function loadReminderSettings(): Promise<ReminderSettings> {
  const file = settingsFile();
  if (!file.exists) return parseReminderSettings(null);
  try {
    return parseReminderSettings(JSON.parse(await file.text()));
  } catch {
    return parseReminderSettings(null);
  }
}

export async function saveReminderSettings(settings: ReminderSettings) {
  const file = settingsFile();
  if (!file.exists) file.create({ intermediates: true });
  file.write(JSON.stringify(settings));
}
