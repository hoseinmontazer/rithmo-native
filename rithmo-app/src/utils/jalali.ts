/**
 * jalali.ts — deterministic Gregorian ⇄ Jalali (Solar Hijri) conversion.
 *
 * Why this file exists
 * --------------------
 * `Date.prototype.toLocaleDateString('fa-IR')` does NOT produce a Jalali date
 * on React Native. Hermes ships without the full ICU calendar data, so the
 * call silently degrades to the Gregorian calendar rendered with Persian
 * month names — which is how the app came to show «۲۱ اوت» (21 August) to
 * Iranian users who expect «۳۰ مرداد ۱۴۰۵». The previous implementation's
 * own docstring claimed it returned Jalali; the device proved otherwise.
 *
 * Locale formatting is therefore not trustworthy for calendar conversion and
 * must not be reintroduced. The arithmetic below is self-contained, has no
 * dependencies, and produces the same result on every engine and device.
 *
 * Algorithm: the standard Birashk-corrected julian-day conversion used by
 * `jalaali-js`, reimplemented here to avoid adding a dependency for ~60
 * lines of integer arithmetic.
 */

export interface JalaliDate {
  /** Solar Hijri year, e.g. 1405 */
  jy: number;
  /** 1-12 */
  jm: number;
  /** 1-31 */
  jd: number;
}

/** Persian month names, index 1-12. */
export const JALALI_MONTHS = [
  '', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
] as const;

/**
 * Persian weekday names indexed by `Date.getDay()` (0 = Sunday), so callers
 * can index directly without remapping to the Iranian week (which starts on
 * Saturday) and getting an off-by-one.
 */
export const PERSIAN_WEEKDAYS = [
  'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه',
] as const;

/** Gregorian (y, m, d) → Julian Day Number. `m` is 1-12. */
function gregorianToJdn(gy: number, gm: number, gd: number): number {
  const a = Math.floor((14 - gm) / 12);
  const y = gy + 4800 - a;
  const m = gm + 12 * a - 3;
  return (
    gd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** Julian Day Number → Gregorian (y, m, d). */
function jdnToGregorian(jdn: number): { gy: number; gm: number; gd: number } {
  let j = jdn + 32044;
  const g = Math.floor(j / 146097);
  const dg = j % 146097;
  const c = Math.floor((Math.floor(dg / 36524) + 1) * 3 / 4);
  const dc = dg - c * 36524;
  const b = Math.floor(dc / 1461);
  const db = dc % 1461;
  const a = Math.floor((Math.floor(db / 365) + 1) * 3 / 4);
  const da = db - a * 365;
  const y = g * 400 + c * 100 + b * 4 + a;
  const m = Math.floor((da * 5 + 308) / 153) - 2;
  const d = da - Math.floor((m + 4) * 153 / 5) + 122;
  return {
    gy: y - 4800 + Math.floor((m + 2) / 12),
    gm: ((m + 2) % 12) + 1,
    gd: d + 1,
  };
}

/**
 * Jalali year → { leap, gy, march } describing the Gregorian year the Jalali
 * year begins in and the March day of Farvardin 1.
 */
function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 1701,
    1985, 2637, 2900, 3178,
  ];
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];

  if (jy < jp || jy >= breaks[bl - 1]) {
    throw new Error(`Jalali year out of supported range: ${jy}`);
  }

  let jump = 0;
  let jm: number;
  for (let i = 1; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) { break; }
    leapJ = leapJ + Math.floor(jump / 33) * 8 + Math.floor((jump % 33) / 4);
    jp = jm;
  }
  let n = jy - jp;

  leapJ = leapJ + Math.floor(n / 33) * 8 + Math.floor(((n % 33) + 3) / 4);
  if (jump % 33 === 4 && jump - n === 4) { leapJ += 1; }

  const leapG = Math.floor(gy / 4) - Math.floor((Math.floor(gy / 100) + 1) * 3 / 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) { n = n - jump + Math.floor((jump + 4) / 33) * 33; }
  let leap = (((n + 1) % 33) - 1) % 4;
  if (leap === -1) { leap = 4; }

  return { leap, gy, march };
}

/** Jalali (jy, jm, jd) → Julian Day Number. */
function jalaliToJdn(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return (
    gregorianToJdn(r.gy, 3, r.march) +
    (jm - 1) * 31 -
    Math.floor(jm / 7) * (jm - 7) +
    jd -
    1
  );
}

/** Convert a JS `Date` (local time) to a Jalali calendar date. */
export function toJalali(date: Date): JalaliDate {
  const jdn = gregorianToJdn(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
  return jdnToJalali(jdn);
}

/** Julian Day Number → Jalali. */
export function jdnToJalali(jdn: number): JalaliDate {
  const gy = jdnToGregorian(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = gregorianToJdn(r.gy, 3, r.march);
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + Math.floor(k / 31), jd: (k % 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) { k += 1; }
  }
  return { jy, jm: 7 + Math.floor(k / 30), jd: (k % 30) + 1 };
}

/** Jalali → JS `Date` at local midnight. Used by tests and round-trips. */
export function fromJalali(jy: number, jm: number, jd: number): Date {
  const { gy, gm, gd } = jdnToGregorian(jalaliToJdn(jy, jm, jd));
  return new Date(gy, gm - 1, gd);
}

/** True when *jy* is a Jalali leap year. */
export function isJalaliLeapYear(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

/**
 * Number of days in a Jalali month.
 *
 * Needed to build a calendar GRID in Jalali space. The cycle calendar used to
 * derive its grid from `new Date(gYear, gMonth, 1)`…`lastDay`, i.e. a
 * GREGORIAN month, and then label it with the Jalali month name that happened
 * to contain the Gregorian 1st. For August 2026 that produced a 31-cell grid
 * spanning 10 Mordad → 9 Shahrivar, titled «مرداد» — wrong length, wrong
 * boundaries, and a third of the cells belonging to the next Jalali month.
 *
 * Months 1-6 have 31 days, 7-11 have 30, and Esfand has 30 in a leap year and
 * 29 otherwise.
 */
export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) { return 31; }
  if (jm <= 11) { return 30; }
  return isJalaliLeapYear(jy) ? 30 : 29;
}

/**
 * Column index (0-6) of a date in a Saturday-first week.
 *
 * The Iranian week begins on شنبه. `Date.getDay()` is Sunday-first, so a grid
 * that offsets by `getDay()` shifts every Jalali month by one column.
 *
 * `PERSIAN_WEEKDAYS` above is deliberately Sunday-indexed because it formats a
 * single date from `getDay()`; this is the grid's counterpart, not a
 * replacement for it.
 */
export function jalaliWeekColumn(date: Date): number {
  return (date.getDay() + 1) % 7;
}

/** Weekday headers for a Jalali grid, Saturday first. */
export const JALALI_GRID_WEEKDAYS = [
  'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه',
] as const;
