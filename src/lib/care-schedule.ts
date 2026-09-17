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

export function addMonths(date: Date, months: number) {
  const shifted = new Date(date.getFullYear(), date.getMonth() + months, 1);
  // Clamp to the last day of the target month, so 31 March minus one month is 28 February.
  const lastDay = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
  return new Date(shifted.getFullYear(), shifted.getMonth(), Math.min(date.getDate(), lastDay));
}

/** The starting assumption: everything watered today, everything fertilized a month ago. */
export function defaultAnchors(today = new Date()): CareAnchors {
  return {
    wateredAt: toDateKey(today),
    fertilizedAt: toDateKey(addMonths(today, -1)),
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
