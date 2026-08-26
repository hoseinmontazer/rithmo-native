/**
 * The calendar grid must be Jalali in BOTH directions.
 *
 * The bug this pins: the grid was constructed in Gregorian space and only
 * *labelled* in Persian. Concretely, in `CycleTrackerScreen`:
 *
 *   - cells came from `new Date(gYear, gMonth, 1)`…`lastDay`, so the grid had
 *     a GREGORIAN month's length and boundaries;
 *   - the title came from `faDateYear(first)` with the day sliced off, naming
 *     whichever Jalali month contained the Gregorian 1st;
 *   - each cell rendered `toFa(day.getDate())` — a Gregorian day-of-month in
 *     Persian digits, which is cosmetic localisation over wrong data;
 *   - the leading offset used `Date.getDay()` (Sunday-first) while the Iranian
 *     week begins on شنبه, shifting every column by one.
 *
 * For August 2026 that produced a 31-cell grid spanning 10 Mordad → 9
 * Shahrivar, titled «مرداد».
 *
 * Storage is deliberately NOT changed: the backend keeps ISO Gregorian
 * `DateField`s, and every cell is still a real `Date`. These tests assert the
 * presentation/interaction layer converts correctly, and that a cell's
 * displayed number refers to the same day the cell selects.
 */
import {
  toJalali,
  fromJalali,
  jalaliMonthLength,
  jalaliWeekColumn,
  isJalaliLeapYear,
  JALALI_MONTHS,
  JALALI_GRID_WEEKDAYS,
} from '@utils/jalali';

describe('Jalali month lengths', () => {
  it('gives the first six months 31 days', () => {
    for (let m = 1; m <= 6; m++) { expect(jalaliMonthLength(1404, m)).toBe(31); }
  });

  it('gives months 7-11 thirty days', () => {
    for (let m = 7; m <= 11; m++) { expect(jalaliMonthLength(1404, m)).toBe(30); }
  });

  it('gives Esfand 30 days in a leap year and 29 otherwise', () => {
    // 1403 is a leap year in the 33-year cycle; 1404 is not.
    expect(isJalaliLeapYear(1403)).toBe(true);
    expect(jalaliMonthLength(1403, 12)).toBe(30);
    expect(isJalaliLeapYear(1404)).toBe(false);
    expect(jalaliMonthLength(1404, 12)).toBe(29);
  });

  it('never produces a month that would drop or invent a day', () => {
    for (let jy = 1400; jy <= 1410; jy++) {
      let total = 0;
      for (let jm = 1; jm <= 12; jm++) { total += jalaliMonthLength(jy, jm); }
      expect(total).toBe(isJalaliLeapYear(jy) ? 366 : 365);
    }
  });
});

describe('representative dates round-trip', () => {
  // Anchors: Nowruz, and the Gregorian date that exposed the old bug.
  const cases: Array<[number, number, number, string]> = [
    [1405, 1, 1, '2026-03-21'],   // Nowruz 1405
    [1404, 1, 1, '2025-03-21'],   // Nowruz 1404
    [1405, 5, 10, '2026-08-01'],  // 1 Aug 2026 — the August case
    [1403, 12, 30, '2025-03-20'], // leap-year Esfand 30
  ];

  for (const [jy, jm, jd, iso] of cases) {
    it(`${jd} ${JALALI_MONTHS[jm]} ${jy} === ${iso}`, () => {
      const d = fromJalali(jy, jm, jd);
      const actual = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      expect(actual).toBe(iso);
      // and back again
      expect(toJalali(d)).toEqual({ jy, jm, jd });
    });
  }
});

describe('the grid is a Jalali month, not a Gregorian one', () => {
  /** The grid `CycleTrackerScreen` builds, extracted so it can be asserted. */
  function buildGrid(jy: number, jm: number): (Date | null)[] {
    const length = jalaliMonthLength(jy, jm);
    const first = fromJalali(jy, jm, 1);
    const startOffset = jalaliWeekColumn(first);
    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) { days.push(null); }
    for (let d = 1; d <= length; d++) { days.push(fromJalali(jy, jm, d)); }
    while (days.length % 7 !== 0) { days.push(null); }
    return days;
  }

  it('every populated cell belongs to the month being displayed', () => {
    // The old grid failed exactly here: a third of August's cells were
    // Shahrivar while the header said Mordad.
    for (let jm = 1; jm <= 12; jm++) {
      const cells = buildGrid(1405, jm).filter(Boolean) as Date[];
      for (const c of cells) {
        expect(toJalali(c).jm).toBe(jm);
        expect(toJalali(c).jy).toBe(1405);
      }
    }
  });

  it('holds exactly the month’s number of days', () => {
    for (let jm = 1; jm <= 12; jm++) {
      const cells = buildGrid(1405, jm).filter(Boolean);
      expect(cells.length).toBe(jalaliMonthLength(1405, jm));
    }
  });

  it('starts the week on شنبه', () => {
    expect(JALALI_GRID_WEEKDAYS[0]).toBe('شنبه');
    // 1 Farvardin 1405 lands on a known weekday; the offset must place it in
    // the column whose header names that day.
    const first = fromJalali(1405, 1, 1);
    const col = jalaliWeekColumn(first);
    // Saturday-first: getDay() 6 (Sat) → column 0, 0 (Sun) → column 1.
    expect(col).toBe((first.getDay() + 1) % 7);
    expect(col).toBeGreaterThanOrEqual(0);
    expect(col).toBeLessThan(7);
  });

  it('pads to whole weeks without shifting any real day', () => {
    for (let jm = 1; jm <= 12; jm++) {
      const grid = buildGrid(1405, jm);
      expect(grid.length % 7).toBe(0);
      const firstReal = grid.findIndex(Boolean);
      expect(firstReal).toBe(jalaliWeekColumn(fromJalali(1405, jm, 1)));
    }
  });

  it('crosses the year boundary without a gap or overlap', () => {
    const lastOfEsfand = buildGrid(1404, 12).filter(Boolean) as Date[];
    const firstOfFarvardin = buildGrid(1405, 1).filter(Boolean) as Date[];
    const end = lastOfEsfand[lastOfEsfand.length - 1];
    const start = firstOfFarvardin[0];
    expect(Math.round((start.getTime() - end.getTime()) / 86400000)).toBe(1);
  });
});

describe('display and interaction agree', () => {
  it('the number shown in a cell is the day that cell selects', () => {
    // The old code showed `day.getDate()` (Gregorian) while selecting the
    // cell's real date — so the user tapped «۱۰» and selected a different day
    // than the one the Jalali header implied.
    for (let jm = 1; jm <= 12; jm++) {
      const length = jalaliMonthLength(1405, jm);
      for (let jd = 1; jd <= length; jd++) {
        const cell = fromJalali(1405, jm, jd);
        expect(toJalali(cell).jd).toBe(jd);
      }
    }
  });

  it('is not thrown off by a local timezone offset', () => {
    // `fromJalali` builds a local-midnight Date, and the app parses API dates
    // as `new Date(iso + 'T00:00:00')` — also local. Both sides must land on
    // the same calendar day regardless of the host offset.
    for (let jm = 1; jm <= 12; jm++) {
      const cell = fromJalali(1405, jm, 1);
      const iso = `${cell.getFullYear()}-${String(cell.getMonth() + 1).padStart(2, '0')}-${String(cell.getDate()).padStart(2, '0')}`;
      const reparsed = new Date(`${iso}T00:00:00`);
      expect(toJalali(reparsed)).toEqual({ jy: 1405, jm, jd: 1 });
    }
  });
});

/**
 * Source-level guard on the screen itself.
 *
 * The assertions above exercise the date primitives and an extracted copy of
 * the grid builder. They would all still pass if `CycleTrackerScreen` were
 * reverted to building its grid from Gregorian months — which is precisely the
 * bug. So the screen is pinned directly.
 */
describe('CycleTrackerScreen builds its grid in Jalali space', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path');
  const src: string = fs.readFileSync(
    path.join(__dirname, '..', 'screens', 'cycle', 'CycleTrackerScreen.tsx'),
    'utf8',
  );

  it('derives the month length from the Jalali calendar', () => {
    expect(src).toMatch(/jalaliMonthLength\(displayYear, displayMonth\)/);
  });

  it('offsets the first row with a Saturday-first column', () => {
    expect(src).toMatch(/jalaliWeekColumn\(/);
  });

  it('builds each cell with fromJalali', () => {
    expect(src).toMatch(/fromJalali\(displayYear, displayMonth, d\)/);
  });

  it('renders the Jalali day number, not the Gregorian one', () => {
    expect(src).toMatch(/toFa\(toJalali\(day\)\.jd\)/);
    expect(src).not.toMatch(/toFa\(day\.getDate\(\)\)/);
  });

  it('titles the header from the Jalali cursor', () => {
    expect(src).toMatch(/JALALI_MONTHS\[displayMonth\]/);
  });

  it('no longer derives the grid from a Gregorian month', () => {
    expect(src).not.toMatch(/new Date\(displayYear, displayMonth \+ 1, 0\)/);
    expect(src).not.toMatch(/new Date\(displayYear, displayMonth, d\)/);
  });
});
