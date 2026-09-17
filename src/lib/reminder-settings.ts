import { DEFAULT_REMINDER_SETTINGS, REMINDER_HOURS, type ReminderSettings } from '@/lib/reminder-plan';

export type { ReminderSettings };

/** Accepts whatever was on disk and returns settings the app can safely act on. */
export function parseReminderSettings(value: unknown): ReminderSettings {
  if (!value || typeof value !== 'object') return DEFAULT_REMINDER_SETTINGS;
  const { enabled, hour } = value as Partial<ReminderSettings>;
  return {
    enabled: enabled === true,
    hour: typeof hour === 'number' && REMINDER_HOURS.includes(hour) ? hour : DEFAULT_REMINDER_SETTINGS.hour,
  };
}
