import { careIntervalDays } from '@/lib/care-interval';
import { LIGHT_LABELS, lightLevelsFromText, plantLightText } from '@/lib/light';
import { headerMatchesField, plantField, type FieldName, type Plant } from '@/lib/plants';

/** Which live hint, if any, belongs under an input. */
export type FieldHint = 'schedule' | 'light' | null;

export type EditableField = {
  /** Unique form key: `field:watering` or `extra:Placement`. */
  key: string;
  label: string;
  value: string;
  hint: FieldHint;
};

/** The recognised fields, in the order they read best on a form. */
const FIELD_ORDER: { field: FieldName; label: string; hint: FieldHint }[] = [
  { field: 'species', label: 'Species', hint: null },
  { field: 'location', label: 'Location', hint: null },
  { field: 'watering', label: 'Watering', hint: 'schedule' },
  { field: 'fertilizing', label: 'Fertilizing', hint: 'schedule' },
  { field: 'light', label: 'Light', hint: 'light' },
  { field: 'acquired', label: 'Acquired', hint: null },
  { field: 'notes', label: 'Notes', hint: null },
];

/** A spreadsheet column gets the hint that suits whatever it holds. */
function hintForExtra(header: string, value: string): FieldHint {
  if (headerMatchesField(header, 'watering') || headerMatchesField(header, 'fertilizing')) {
    return 'schedule';
  }
  if (lightLevelsFromText(value).length > 0) return 'light';
  return null;
}

/**
 * Every field of a plant that can be edited: its name, the recognised fields,
 * and each unrecognised spreadsheet column under its own heading.
 *
 * A recognised field with no value is offered as a blank so it can be filled in
 * — unless a spreadsheet column already covers it, which would otherwise put two
 * inputs for the same thing on one form.
 */
export function editableFields(plant: Plant): EditableField[] {
  const fields: EditableField[] = [
    { key: 'field:name', label: 'Name', value: plant.name, hint: null },
  ];

  for (const { field, label, hint } of FIELD_ORDER) {
    const own = plant[field] ?? '';
    if (own) {
      fields.push({ key: `field:${field}`, label, value: own, hint });
      continue;
    }
    // Light is found by what a column says rather than what it is called.
    const covered = field === 'light' ? Boolean(plantLightText(plant)) : Boolean(plantField(plant, field));
    if (!covered) fields.push({ key: `field:${field}`, label, value: '', hint });
  }

  for (const [header, value] of Object.entries(plant.extra)) {
    fields.push({ key: `extra:${header}`, label: header, value, hint: hintForExtra(header, value) });
  }

  return fields;
}

/** Applies edited values back onto a plant. An emptied field is dropped. */
export function applyEdits(plant: Plant, values: Record<string, string>): Plant {
  const next: Plant = { ...plant, extra: { ...plant.extra } };

  for (const [key, raw] of Object.entries(values)) {
    const value = raw.trim();
    const [kind, name] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];

    if (kind === 'extra') {
      if (value) next.extra[name] = value;
      else delete next.extra[name];
      continue;
    }

    const field = name as FieldName;
    if (field === 'name') {
      if (value) next.name = value;
      continue;
    }
    if (value) next[field] = value;
    else delete next[field];
  }

  return next;
}

/** What the app reads from a schedule or light value, shown as it is typed. */
export function hintText(hint: FieldHint, text: string): string | null {
  if (!hint || !text.trim()) return null;

  if (hint === 'schedule') {
    const days = careIntervalDays(text);
    if (days === undefined) return 'No schedule found here.';
    const rounded = Number.isInteger(days) ? days : Number(days.toFixed(1));
    return `Read as every ${rounded} ${rounded === 1 ? 'day' : 'days'}.`;
  }

  const levels = lightLevelsFromText(text);
  if (levels.length === 0) return 'No light level found here.';
  return `Read as ${levels.map((level) => LIGHT_LABELS[level]).join(', ')}.`;
}
