import type { Reminder } from '@/lib/reminder-plan';

/** expo-notifications has no web implementation; the UI offers reminders only where they work. */
export const remindersSupported = false;

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getReminderPermission(): Promise<PermissionState> {
  return 'denied';
}

export async function requestReminderPermission(): Promise<PermissionState> {
  return 'denied';
}

export async function syncScheduledReminders(_reminders: Reminder[]): Promise<number> {
  return 0;
}
