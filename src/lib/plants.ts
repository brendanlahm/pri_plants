import { read, utils, type WorkBook } from 'xlsx';

/** A single plant, as imported from one row of a spreadsheet. */
export type Plant = {
  /** Stable key for lists; derived from the row position and name. */
  id: string;
  name: string;
  species?: string;
  location?: string;
  watering?: string;
  fertilizing?: string;
  light?: string;
  acquired?: string;
  notes?: string;
  /** Any column we don't recognize, kept so nothing from the sheet is lost. */
  extra: Record<string, string>;
  /** Typed in by hand rather than read from a spreadsheet. */
  addedByHand?: boolean;
  /** Stored photo: a file name on device, a data uri on the web. */
  photo?: string;
};

/** Known fields and the header spellings we accept for each. */
const FIELD_ALIASES = {
  name: ['name', 'plant', 'plantname', 'commonname', 'title'],
  species: ['species', 'botanicalname', 'scientificname', 'latinname', 'variety', 'genus'],
  location: ['location', 'room', 'spot', 'place', 'where', 'position'],
  watering: [
    'watering',
    'water',
    'waterevery',
    'wateringschedule',
    'wateringfrequency',
    'waterfrequency',
    'howoftentowater',
    'frequency',
  ],
  light: ['light', 'sunlight', 'sun', 'lightlevel', 'exposure'],
  acquired: ['acquired', 'dateacquired', 'acquiredon', 'purchased', 'datepurchased', 'added', 'date'],
  fertilizing: [
    'fertilizing',
    'fertilising',
    'fertilization',
    'fertilisation',
    'fertilizer',
    'fertiliser',
    'fertilizationfrequency',
    'fertilisationfrequency',
    'fertilizerfrequency',
    'feeding',
    'feedingfrequency',
    'feed',
  ],
  notes: ['notes', 'note', 'comments', 'description', 'remarks'],
} satisfies Record<string, readonly string[]>;

export type FieldName = keyof typeof FIELD_ALIASES;

const FIELD_NAMES = Object.keys(FIELD_ALIASES) as FieldName[];

/** Strips case, spaces and punctuation so `"Common Name "` matches `commonname`. */
function normalizeHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchField(header: string): FieldName | null {
  const normalized = normalizeHeader(header);
  if (!normalized) return null;
  return FIELD_NAMES.find((field) => FIELD_ALIASES[field].includes(normalized)) ?? null;
}

function cellToString(value: unknown) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function rowIsEmpty(row: unknown[]) {
  return row.every((cell) => cellToString(cell) === '');
}

/**
 * Finds the header row. Spreadsheets often start with a title or blank rows, so
 * we take the first row that names a column we recognize, and otherwise assume
 * the first non-empty row is the header.
 */
function findHeaderRow(rows: unknown[][]) {
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (rowIsEmpty(row)) continue;
    if (row.some((cell) => matchField(cellToString(cell)) !== null)) return index;
  }
  return rows.findIndex((row) => !rowIsEmpty(row));
}

export class PlantImportError extends Error {}

/** Turns the first sheet of a workbook into plants. */
export function plantsFromWorkbook(workbook: WorkBook): Plant[] {
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) throw new PlantImportError('That file has no sheets in it.');

  const rows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' });
  const headerIndex = findHeaderRow(rows);
  if (headerIndex < 0) throw new PlantImportError('That sheet is empty.');

  const headers = rows[headerIndex].map(cellToString);
  const fields = headers.map(matchField);
  if (!fields.includes('name')) {
    throw new PlantImportError(
      'No plant name column found. Add a column headed "Name" (or "Plant") and try again.'
    );
  }

  const plants: Plant[] = [];
  for (let index = headerIndex + 1; index < rows.length; index++) {
    const row = rows[index];
    if (rowIsEmpty(row)) continue;

    const plant: Plant = { id: `${index}`, name: '', extra: {} };
    headers.forEach((header, column) => {
      const value = cellToString(row[column]);
      if (!value) return;
      const field = fields[column];
      if (field) plant[field] = value;
      else if (header) plant.extra[header] = value;
    });

    if (!plant.name) continue;
    plant.id = `${index}-${normalizeHeader(plant.name)}`;
    plants.push(plant);
  }

  if (plants.length === 0) {
    throw new PlantImportError('No plants found — every row under the header was empty.');
  }
  return plants;
}

/** Parses a spreadsheet held as base64 (native) or raw bytes (web). */
export function parsePlantSpreadsheet(input: { base64: string } | { data: ArrayBuffer }): Plant[] {
  let workbook: WorkBook;
  try {
    workbook =
      'base64' in input
        ? read(input.base64, { type: 'base64', cellDates: true })
        : read(input.data, { type: 'array', cellDates: true });
  } catch {
    throw new PlantImportError("That file couldn't be read as a spreadsheet.");
  }
  return plantsFromWorkbook(workbook);
}

/**
 * Reads a field off a plant, falling back to an unrecognised column whose header
 * matches. Libraries imported before a column was recognised keep that value in
 * `extra`, and re-importing the spreadsheet should not be a prerequisite for
 * features that read it.
 */
export function plantField(plant: Plant, field: FieldName): string | undefined {
  const direct = plant[field];
  if (direct) return direct;

  const aliases: readonly string[] = FIELD_ALIASES[field];
  for (const [header, value] of Object.entries(plant.extra)) {
    if (value && aliases.includes(normalizeHeader(header))) return value;
  }
  return undefined;
}

/** Whether a spreadsheet heading would be read as this field. */
export function headerMatchesField(header: string, field: FieldName) {
  const aliases: readonly string[] = FIELD_ALIASES[field];
  return aliases.includes(normalizeHeader(header));
}
