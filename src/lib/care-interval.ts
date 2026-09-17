/**
 * Care columns are free text ("Every 3-4 weeks, let soil dry out completely"),
 * so scheduling or sorting by them means reading an approximate interval out of
 * the prose. Used for both the watering and the fertilizing columns.
 */

const UNIT_DAYS: Record<string, number> = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

/** Spelled-out counts that show up in care instructions. */
const WORD_NUMBERS: Record<string, number> = {
  once: 1,
  twice: 2,
  thrice: 3,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
};

/** Single words that imply an interval on their own. */
const KEYWORD_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  'bi-weekly': 14,
  fortnightly: 14,
  monthly: 30,
  quarterly: 91.25,
  'half-yearly': 182.5,
  halfyearly: 182.5,
  'semi-annually': 182.5,
  semiannually: 182.5,
  biannually: 182.5,
  yearly: 365,
  annually: 365,
};

// The ordinal suffix is consumed but not captured, so "every 3rd day" reads as 3.
const COUNT =
  '(\\d+(?:\\.\\d+)?|once|twice|thrice|one|two|three|four|five|six|seven)(?:st|nd|rd|th)?';
const RANGE_SEPARATOR = '(?:\\s*(?:-|–|—|to|or)\\s*(\\d+(?:\\.\\d+)?))?';
const UNIT = '(day|week|month|year)s?';

/** How often per unit of time — "2-3x per week", "twice a week". */
const RATE = new RegExp(`${COUNT}${RANGE_SEPARATOR}\\s*(?:x|times)?\\s*(?:per|a|each|/)\\s*${UNIT}`, 'gi');
/** How long between waterings — "every 3-4 weeks", "every 2 weeks". */
const INTERVAL = new RegExp(`every\\s+${COUNT}${RANGE_SEPARATOR}\\s*${UNIT}`, 'gi');
/** "every other day" */
const EVERY_OTHER = new RegExp(`every\\s+other\\s+${UNIT}`, 'gi');
/** "every day", with no number at all. */
const EVERY_UNIT = new RegExp(`every\\s+${UNIT}`, 'gi');
const KEYWORD =
  /\b(half-yearly|halfyearly|semi-annually|semiannually|biannually|quarterly|bi-weekly|biweekly|fortnightly|daily|weekly|monthly|yearly|annually)\b/gi;

function toNumber(value: string | undefined) {
  if (!value) return undefined;
  const word = WORD_NUMBERS[value.toLowerCase()];
  if (word !== undefined) return word;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/** A range like "3-4 weeks" is treated as its midpoint. */
function average(low: number, high: number | undefined) {
  return high === undefined ? low : (low + high) / 2;
}

type Reading = { index: number; days: number };

function collect(pattern: RegExp, text: string, toDays: (match: RegExpExecArray) => number | undefined) {
  const readings: Reading[] = [];
  pattern.lastIndex = 0;
  let match = pattern.exec(text);
  while (match !== null) {
    const days = toDays(match);
    if (days !== undefined && days > 0) readings.push({ index: match.index, days });
    match = pattern.exec(text);
  }
  return readings;
}

/**
 * Approximate days between one round of care and the next, or `undefined` when
 * the text says nothing usable ("Occasionally, spring-summer only"). A range is
 * read as its midpoint, so "every 2-3 weeks" is 17.5 days. Where a value
 * describes more than one season ("every 2-3 weeks in summer; monthly in
 * winter") the earliest reading wins, since care sheets lead with the main
 * growing season.
 */
export function careIntervalDays(text: string | undefined): number | undefined {
  if (!text) return undefined;

  const readings: Reading[] = [
    ...collect(RATE, text, (match) => {
      const count = toNumber(match[1]);
      const unit = UNIT_DAYS[match[3].toLowerCase()];
      if (count === undefined || unit === undefined) return undefined;
      return unit / average(count, toNumber(match[2]));
    }),
    ...collect(INTERVAL, text, (match) => {
      const count = toNumber(match[1]);
      const unit = UNIT_DAYS[match[3].toLowerCase()];
      if (count === undefined || unit === undefined) return undefined;
      return average(count, toNumber(match[2])) * unit;
    }),
    ...collect(EVERY_OTHER, text, (match) => {
      const unit = UNIT_DAYS[match[1].toLowerCase()];
      return unit === undefined ? undefined : unit * 2;
    }),
    ...collect(EVERY_UNIT, text, (match) => UNIT_DAYS[match[1].toLowerCase()]),
    ...collect(KEYWORD, text, (match) => KEYWORD_DAYS[match[1].toLowerCase()]),
  ];

  if (readings.length === 0) return undefined;
  return readings.reduce((earliest, reading) =>
    reading.index < earliest.index ? reading : earliest
  ).days;
}
