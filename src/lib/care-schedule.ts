import { careIntervalDays } from '@/lib/care-interval';
import { plantField, type Plant } from '@/lib/plants';

export type CareKind = 'water' | 'fertilize';

export const CARE_KINDS: CareKind[] = ['water', 'fertilize'];

export const CARE_LABELS: Record<CareKind, string> = {
  water: 'Water',
  fertilize: 'Fertilize',
};

/** When every plant was last cared for. Both are `YYYY-MM-DD` in local time. */
export type CareAnchors = {
  wateredAt: string;
  fertilizedAt: string;
};

const MS_PER_DAY = 86_400_000;

/**
 * Dates are handled as whole day numbers rather than timestamps. A schedule that
 * adds 17.5-day intervals to a `Date` would drift across a daylight-saving
 * boundary; counting days cannot.
 */
export function toDayNumber(date: Date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY);
}

export function fromDayNumber(day: number) {
  const date = new Date(day * MS_PER_DAY);
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function toDateKey(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * The starting assumption: everything watered today, and fertilizing counted
 * from tomorrow.
 *
 * Back-dating the fertilizing anchor put the monthly plants' first feed in the
 * past, and past dates are skipped — so they vanished from the calendar for a
 * month with nothing to say they had been missed. Counting from tomorrow gives
 * every plant a first feed that is genuinely ahead of it.
 */
export function defaultAnchors(today = new Date()): CareAnchors {
  const tomorrow = fromDayNumber(toDayNumber(today) + 1);
  return {
    wateredAt: toDateKey(today),
    fertilizedAt: toDateKey(tomorrow),
  };
}

export function careText(plant: Plant, kind: CareKind) {
  return plantField(plant, kind === 'water' ? 'watering' : 'fertilizing');
}

/** Days between rounds of care, or `undefined` when the column says nothing usable. */
export function careInterval(plant: Plant, kind: CareKind) {
  return careIntervalDays(careText(plant, kind));
}

export type CareEvent = {
  plantId: string;
  plantName: string;
  kind: CareKind;
};

/**
 * Every due date between `from` and `to` inclusive, keyed by `YYYY-MM-DD`.
 *
 * Occurrences are measured from the anchor rather than from the previous
 * occurrence, so a 17.5-day interval lands on days 18, 35, 53 and keeps its
 * average cadence instead of rounding up every time and drifting late.
 */
export function careEventsByDate(
  plants: Plant[],
  anchors: CareAnchors,
  from: Date,
  to: Date
): Map<string, CareEvent[]> {
  const events = new Map<string, CareEvent[]>();
  const firstDay = toDayNumber(from);
  const lastDay = toDayNumber(to);
  if (lastDay < firstDay) return events;

  for (const kind of CARE_KINDS) {
    const anchorDay = toDayNumber(fromDateKey(kind === 'water' ? anchors.wateredAt : anchors.fertilizedAt));

    for (const plant of plants) {
      const interval = careInterval(plant, kind);
      if (interval === undefined) continue;

      // Start an occurrence early and let the `day < firstDay` guard below skip
      // what falls outside: rounding can pull an occurrence back a day, so the
      // exact quotient is not a safe lower bound.
      const occurrence = Math.max(1, Math.floor((firstDay - anchorDay) / interval) - 1);
      for (let n = occurrence; ; n++) {
        const day = anchorDay + Math.round(n * interval);
        if (day > lastDay) break;
        if (day < firstDay) continue;

        const key = toDateKey(fromDayNumber(day));
        const list = events.get(key);
        const event: CareEvent = { plantId: plant.id, plantName: plant.name, kind };
        if (list) list.push(event);
        else events.set(key, [event]);
      }
    }
  }

  return events;
}

/** Plants whose column for this kind of care holds no readable schedule. */
export function plantsWithoutSchedule(plants: Plant[], kind: CareKind) {
  return plants.filter((plant) => careInterval(plant, kind) === undefined);
}

/** "13 to water · 2 to feed", or "Nothing due" when the day is clear. */
export function summarizeCare(events: CareEvent[]) {
  const parts = CARE_KINDS.map((kind) => {
    const total = events.filter((event) => event.kind === kind).length;
    return total === 0 ? null : `${total} to ${kind === 'water' ? 'water' : 'feed'}`;
  }).filter(Boolean);
  return parts.length === 0 ? 'Nothing due' : parts.join(' · ');
}

/** Plant names for a day, deduplicated — one plant can need both water and feeding. */
export function careEventNames(events: CareEvent[], max = 4) {
  const all = [...new Set(events.map((event) => event.plantName))];
  if (all.length <= max) return all.join(', ');
  return `${all.slice(0, max).join(', ')} and ${all.length - max} more`;
}

/**
 * The most recent care date at or before `today`, or null if there has not been
 * one yet.
 *
 * Watering counts its anchor as a real past watering — the schedule starts from
 * "everything watered that day". Fertilizing does not: its anchor is the point
 * the count begins, so the first feed is one interval after it.
 */
export function lastCareDay(
  plant: Plant,
  kind: CareKind,
  anchors: CareAnchors,
  todayDay: number
): number | null {
  const interval = careInterval(plant, kind);
  if (interval === undefined) return null;

  const anchorDay = toDayNumber(
    fromDateKey(kind === 'water' ? anchors.wateredAt : anchors.fertilizedAt)
  );
  const earliest = kind === 'water' ? 0 : 1;

  // Start past the answer and walk back, since rounding each occurrence means
  // the quotient alone is not exact.
  let n = Math.floor((todayDay - anchorDay) / interval) + 2;
  while (n >= earliest) {
    const day = anchorDay + Math.round(n * interval);
    if (day <= todayDay) return day;
    n--;
  }
  return null;
}
