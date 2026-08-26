/**
 * Jalali dates — regression cover for a shipped defect.
 *
 * The app displayed «۲۱ اوت» and "Aug 19, 2026" to Persian users because
 * `toLocaleDateString('fa-IR')` does not convert calendars on Hermes. The
 * failure was invisible in code review (the function was *named* faDate and
 * its docstring claimed Jalali) and invisible in a screenshot unless you
 * knew the correct answer. That is exactly the class of bug that needs a
 * test with known-good values.
 */

import { execFileSync } from 'child_process';
import path from 'path';

import { faDate, faDateShort, faDateYear, faWeekday, toFa } from '@utils/persian';
import { fromJalali, isJalaliLeapYear, toJalali } from '@utils/jalali';

describe('Gregorian → Jalali conversion', () => {
  // Verified reference points spanning month boundaries, a leap year, and
  // both directions across Nowruz.
  const CASES: Array<[string, number, number, number]> = [
    ['2026-08-21', 1405, 5, 30],   // the date the audit ran
    ['2026-03-21', 1405, 1, 1],    // Nowruz 1405
    ['2026-03-20', 1404, 12, 29],  // the day before Nowruz
    ['2024-03-20', 1403, 1, 1],    // Nowruz 1403
    ['2025-01-01', 1403, 10, 12],  // mid-winter
    ['2000-01-01', 1378, 10, 11],  // pre-2000 boundary
  ];

  it.each(CASES)('%s → %i/%i/%i', (iso, jy, jm, jd) => {
    const [y, m, d] = iso.split('-').map(Number);
    expect(toJalali(new Date(y, m - 1, d))).toEqual({ jy, jm, jd });
  });

  it('round-trips back to the same Gregorian day', () => {
    for (const [iso, jy, jm, jd] of CASES) {
      const back = fromJalali(jy, jm, jd);
      const [y, m, d] = iso.split('-').map(Number);
      expect([back.getFullYear(), back.getMonth() + 1, back.getDate()]).toEqual([y, m, d]);
    }
  });

  it('identifies Jalali leap years', () => {
    expect(isJalaliLeapYear(1403)).toBe(true);
    expect(isJalaliLeapYear(1404)).toBe(false);
  });
});

describe('user-facing formatters', () => {
  const aug21 = new Date(2026, 7, 21); // Friday 21 Aug 2026 = جمعه ۳۰ مرداد ۱۴۰۵

  it('formats a full Jalali date with Persian digits', () => {
    expect(faDate(aug21)).toBe('جمعه ۳۰ مرداد ۱۴۰۵');
  });

  it('formats short and year variants', () => {
    expect(faDateShort(aug21)).toBe('۳۰ مرداد');
    expect(faDateYear(aug21)).toBe('۳۰ مرداد ۱۴۰۵');
    expect(faWeekday(aug21)).toBe('جمعه');
  });

  it('honours the weekday/year switches', () => {
    expect(faDate(aug21, { weekday: false })).toBe('۳۰ مرداد ۱۴۰۵');
    expect(faDate(aug21, { year: false })).toBe('جمعه ۳۰ مرداد');
  });

  it('NEVER emits a Gregorian month name', () => {
    // The exact regression: "اوت"/"سپتامبر"/"Aug" reaching a Persian screen.
    const gregorian = ['اوت', 'سپتامبر', 'ژانویه', 'Aug', 'Sep', 'Jan', '2026'];
    for (let day = 1; day <= 28; day += 1) {
      const rendered = faDate(new Date(2026, day % 12, day));
      for (const bad of gregorian) {
        expect(rendered).not.toContain(bad);
      }
    }
  });

  it('returns empty string for an invalid date rather than throwing', () => {
    expect(faDate('not-a-date')).toBe('');
    expect(faDateShort(NaN)).toBe('');
  });
});

describe('bare calendar-date strings are timezone-safe', () => {
  // Regression for a real bug: `persian.ts`'s formatters parsed a bare
  // 'YYYY-MM-DD' string (exactly what the backend sends for period/log
  // dates) with `new Date(str)`, which the spec parses as UTC MIDNIGHT, not
  // local midnight. On any device west of UTC that is a different local
  // calendar day, so a period logged for 2026-08-21 rendered as 20 Aug
  // (۲۹ مرداد) instead of 21 Aug (۳۰ مرداد). Iran (UTC+3:30) never showed
  // the bug, which is exactly why it shipped unnoticed.
  //
  // A runtime `process.env.TZ = ...` reassignment inside a running Jest
  // worker is NOT reliable — the timezone offset is already fixed earlier
  // in worker startup regardless of later reassignment (confirmed: mutating
  // it mid-test here does not change `Date#getTimezoneOffset()`). The only
  // faithful check is a fresh process with `TZ` set before Node starts, so
  // this spawns the real formatter in a subprocess per timezone.
  const repoRoot = path.join(__dirname, '..', '..');
  const jestBin = path.join(repoRoot, 'node_modules', '.bin', 'jest');
  const probe = path.join(__dirname, 'fixtures', 'tzBareDateProbe.test.ts');

  it.each(['Asia/Tehran', 'America/Los_Angeles', 'Pacific/Kiritimati'])(
    'renders the correct Jalali day for a bare date string under TZ=%s',
    (tz) => {
      expect(() =>
        execFileSync(jestBin, [probe, '--silent'], {
          cwd: repoRoot,
          env: { ...process.env, TZ: tz },
          stdio: 'pipe',
        }),
      ).not.toThrow();
    },
    20000,
  );

  it('a Date object (already a local instant) formats correctly without needing TZ control', () => {
    const aug21 = new Date(2026, 7, 21);
    expect(faDateShort(aug21)).toBe('۳۰ مرداد');
  });
});

describe('digit formatting', () => {
  it('converts Latin digits to Persian', () => {
    expect(toFa(100)).toBe('۱۰۰');
    expect(toFa('60%')).toBe('۶۰%');
    expect(toFa(7.5)).toBe('۷٫۵');
  });

  it('is safe for null/undefined', () => {
    expect(toFa(null)).toBe('');
    expect(toFa(undefined)).toBe('');
  });
});
