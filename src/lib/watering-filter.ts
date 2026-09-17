import { careInterval } from '@/lib/care-schedule';
import type { Plant } from '@/lib/plants';

/** `all` keeps everything; otherwise the interval in days, as a string key. */
export type WateringFilter = 'all' | string;

export type WateringGroup = {
  key: string;
  label: string;
  days: number;
  count: number;
};

/** "Weekly" reads better than "every 7 days"; "every 17.5 days" has no better form. */
export function wateringLabel(days: number) {
  if (days === 1) return 'Daily';
  if (days === 7) return 'Weekly';
  if (days % 7 === 0) return `Every ${days / 7} weeks`;
  const rounded = Number.isInteger(days) ? days : Number(days.toFixed(1));
  return `Every ${rounded} days`;
}

/**
 * The watering frequencies this list actually uses, most often first.
 *
 * Built from the plants rather than a fixed set, so the filter only ever offers
 * something that matches at least one of them.
 */
export function wateringGroups(plants: Plant[]): WateringGroup[] {
  const counts = new Map<number, number>();
  for (const plant of plants) {
    const days = careInterval(plant, 'water');
    if (days === undefined) continue;
    counts.set(days, (counts.get(days) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([days, count]) => ({ key: `${days}`, label: wateringLabel(days), days, count }));
}

export function filterByWatering(plants: Plant[], filter: WateringFilter): Plant[] {
  if (filter === 'all') return plants;
  const wanted = Number(filter);
  return plants.filter((plant) => careInterval(plant, 'water') === wanted);
}
