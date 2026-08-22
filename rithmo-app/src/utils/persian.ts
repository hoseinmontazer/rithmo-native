/**
 * persian.ts — Persian UX layer: digits + dates + greeting.
 *
 * The app is Persian-first: every number rendered in the UI goes through
 * toFa(), every user-facing date through faDate(). Terminology:
 *   چرخه = cycle   (standardized — never سیکل)
 *   دوره = period  (menstruation, the app's established term)
 */

import { JALALI_MONTHS, PERSIAN_WEEKDAYS, toJalali } from '@utils/jalali';

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;

/**
 * Convert Latin digits in a value to Persian digits.
 *  - 300000        → "۳۰۰۰۰۰"
 *  - toFa(300000, { grouped: true }) → "۳۰۰٬۰۰۰"
 *  - 0.72          → "۰٫۷۲"  (decimal point becomes ٫)
 *  - "14/5"        → "۱۴/۵"
 */
export function toFa(
  value: number | string | null | undefined,
  opts: { grouped?: boolean } = {},
): string {
  if (value === null || value === undefined || value === '') { return ''; }

  let s: string;
  if (typeof value === 'number' && opts.grouped && Number.isFinite(value)) {
    s = value.toLocaleString('en-US');
  } else {
    s = String(value);
  }

  let out = '';
  for (const ch of s) {
    if (ch >= '0' && ch <= '9') {
      out += FA_DIGITS[Number(ch)];
    } else if (ch === ',' ) {
      out += '٬';
    } else if (ch === '.') {
      out += '٫';
    } else {
      out += ch;
    }
  }
  return out;
}

function toDate(value: Date | string | number): Date | null {
  const d = typeof value === 'object' ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * User-facing dates are JALALI. Always.
 *
 * These used to delegate to `toLocaleDateString('fa-IR')`, which does not
 * perform calendar conversion on Hermes (no full ICU) — it returned a
 * Gregorian date in Persian words, so the app showed «۲۱ اوت» where users
 * expect «۳۰ مرداد». Conversion now goes through utils/jalali.ts, which is
 * pure arithmetic and behaves identically on every device.
 *
 * `faDate` and friends are the ONLY user-facing date formatters in the app.
 * Anything that needs a machine-facing date string must use
 * `formatDateISO()` from utils/dateUtils.
 */

/** "۳۰ مرداد" */
export function faDateShort(value: Date | string | number): string {
  const d = toDate(value);
  if (!d) { return ''; }
  const { jm, jd } = toJalali(d);
  return `${toFa(jd)} ${JALALI_MONTHS[jm]}`;
}

/** "۳۰ مرداد ۱۴۰۵" */
export function faDateYear(value: Date | string | number): string {
  const d = toDate(value);
  if (!d) { return ''; }
  const { jy, jm, jd } = toJalali(d);
  return `${toFa(jd)} ${JALALI_MONTHS[jm]} ${toFa(jy)}`;
}

/** "جمعه" */
export function faWeekday(value: Date | string | number): string {
  const d = toDate(value);
  if (!d) { return ''; }
  return PERSIAN_WEEKDAYS[d.getDay()];
}

/**
 * Full user-facing date. "جمعه ۳۰ مرداد ۱۴۰۵" by default.
 *
 * `opts.weekday === false` drops the weekday; `opts.year === false` drops
 * the year. The old `Intl.DateTimeFormatOptions` parameter is gone on
 * purpose — accepting it invited callers to reach for locale formatting
 * again, which is the bug this module exists to prevent.
 */
export function faDate(
  value: Date | string | number,
  opts: { weekday?: boolean; year?: boolean } = {},
): string {
  const d = toDate(value);
  if (!d) { return ''; }
  const { weekday = true, year = true } = opts;
  const body = year ? faDateYear(d) : faDateShort(d);
  return weekday ? `${PERSIAN_WEEKDAYS[d.getDay()]} ${body}` : body;
}

/** Time-aware Persian greeting. */
export function faGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) { return 'صبح‌تان بخیر'; }
  if (h >= 12 && h < 17) { return 'روزتان بخیر'; }
  return 'شبتان بخیر';
}
