import {
  CARE_KINDS,
  careEventsByDate,
  fromDateKey,
  type CareAnchors,
  type CareEvent,
  type CareKind,
} from '@/lib/care-schedule';
import type { Plant } from '@/lib/plants';

export type ReminderSettings = {
  enabled: boolean;
  /** Local hour of day the reminder fires, 0-23. */
  hour: number;
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = { enabled: false, hour: 9 };

/** Offered as presets rather than a free time picker. */
export const REMINDER_HOURS = [7, 9, 12, 18];

/**
 * iOS keeps only the 64 soonest-firing pending requests and silently drops the
 * rest, so one notification per day with everything due on it — never one per
 * plant — and a ceiling with headroom to spare.
 */
export const MAX_REMINDERS = 48;

/** How far ahead to schedule. Refreshed whenever the app opens the calendar. */
export const REMINDER_HORIZON_DAYS = 120;

/** Names listed in full before the body switches to a count. */
const MAX_NAMES = 5;

export type Reminder = {
  /** Exact local moment the notification fires. */
  date: Date;
  title: string;
  body: string;
};

function names(events: CareEvent[]) {
  const all = events.map((event) => event.plantName);
  if (all.length <= MAX_NAMES) return all.join(', ');
  return `${all.slice(0, MAX_NAMES).join(', ')} and ${all.length - MAX_NAMES} more`;
}

function phrase(kind: CareKind, events: CareEvent[]) {
  const verb = kind === 'water' ? 'Water' : 'Feed';
  if (events.length === 1) return `${verb} ${events[0].plantName}`;
  return `${verb} ${events.length} plants`;
}

function describe(events: CareEvent[]) {
  const byKind = CARE_KINDS.map((kind) => ({
    kind,
    events: events.filter((event) => event.kind === kind),
  })).filter((group) => group.events.length > 0);

  const title = byKind.map((group) => phrase(group.kind, group.events)).join(' · ');
  const body = byKind
    .map((group) => `${group.kind === 'water' ? 'Water' : 'Fertilize'}: ${names(group.events)}`)
    .join('\n');
  return { title, body };
}

/**
 * One reminder per day that has anything due, from now to the horizon.
 *
 * Days whose reminder time has already passed today are skipped — scheduling a
 * notification in the past either fires immediately or is dropped, and neither
 * is what someone setting a 9am reminder at noon expects.
 */
export function buildReminders(
  plants: Plant[],
  anchors: CareAnchors,
  settings: ReminderSettings,
  now = new Date()
): Reminder[] {
  if (!settings.enabled || plants.length === 0) return [];

  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + REMINDER_HORIZON_DAYS);
  const eventsByDate = careEventsByDate(plants, anchors, from, to);

  const reminders: Reminder[] = [];
  for (const key of [...eventsByDate.keys()].sort()) {
    const day = fromDateKey(key);
    const date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), settings.hour, 0, 0, 0);
    if (date.getTime() <= now.getTime()) continue;

    const { title, body } = describe(eventsByDate.get(key)!);
    reminders.push({ date, title, body });
    if (reminders.length === MAX_REMINDERS) break;
  }
  return reminders;
}
