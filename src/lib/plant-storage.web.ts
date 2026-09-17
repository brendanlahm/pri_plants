import type { PlantLibrary } from '@/lib/plant-library';
import { emptyLibrary, parseLibrary } from '@/lib/plant-library';
import { parseReminderSettings, type ReminderSettings } from '@/lib/reminder-settings';

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

const SETTINGS_KEY = 'pri_plants.reminders';

export async function loadReminderSettings(): Promise<ReminderSettings> {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return parseReminderSettings(stored ? JSON.parse(stored) : null);
  } catch {
    return parseReminderSettings(null);
  }
}

export async function saveReminderSettings(settings: ReminderSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing or a full quota — the choice just will not persist.
  }
}
