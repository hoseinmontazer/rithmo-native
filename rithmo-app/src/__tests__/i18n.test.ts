/**
 * The API → Persian boundary.
 *
 * The shipped defect was the client rendering the backend's own English
 * prose: «Day 1 of your period.» on the cycle screen and «(medium)» inside
 * a Persian sentence. These tests pin the rule that the client composes
 * Persian from machine values and never echoes server text.
 */

import {
  confidenceLabel,
  navTitle,
  phaseDescription,
  phaseLabel,
  phasePlainLabel,
  planLabel,
  subscriptionStatusLabel,
  medicationFrequencyLabel,
} from '@i18n';
import { toFa } from '@utils/persian';
import { navTitles } from '@i18n/strings.fa';

const LATIN = /[A-Za-z]/;

describe('confidence labels', () => {
  it('maps backend values to Persian', () => {
    expect(confidenceLabel('medium')).toBe('متوسط');
    expect(confidenceLabel('low')).toBe('کم');
    expect(confidenceLabel('high')).toBe('زیاد');
    expect(confidenceLabel('established')).toBe('الگوی تثبیت‌شده');
  });

  it('returns empty for unknown input instead of echoing English', () => {
    // A new backend enum must degrade to silence, never leak.
    expect(confidenceLabel('brand_new_tier')).toBe('');
    expect(confidenceLabel(null)).toBe('');
  });
});

describe('phase labels', () => {
  it('maps phases and lifecycle states', () => {
    expect(phaseLabel('menstrual')).toBe('قاعدگی');
    expect(phaseLabel('luteal')).toBe('لوتئال');
    expect(phaseLabel('overdue')).toBe('عقب‌افتاده');
  });

  it('falls back to نامشخص for anything unrecognised', () => {
    expect(phaseLabel('speculative_phase')).toBe('نامشخص');
    expect(phaseLabel(undefined)).toBe('نامشخص');
  });

  it('offers plain-language wording alongside the clinical term', () => {
    expect(phasePlainLabel('luteal')).toBe('هفته‌های پیش از دوره');
    expect(phasePlainLabel('follicular')).toBe('نیمه اول چرخه');
  });
});

describe('phaseDescription — replaces the English prose from the API', () => {
  it('builds the sentence from phase + cycle day', () => {
    // Was: "Day 1 of your period."
    expect(phaseDescription('menstrual', 1)).toBe('روز ۱ دوره‌ات');
    expect(phaseDescription('menstrual', 3)).toBe('روز ۳ دوره‌ات');
  });

  it('covers every phase the backend can send, in Persian only', () => {
    const phases = [
      'menstrual', 'follicular', 'ovulation', 'luteal',
      'expected', 'late', 'overdue', 'unknown', 'something_new',
    ];
    for (const p of phases) {
      const out = phaseDescription(p, 5, -2);
      expect(out.length).toBeGreaterThan(0);
      expect(out).not.toMatch(LATIN);
    }
  });

  it('reports lateness in Persian digits', () => {
    expect(phaseDescription('overdue', 34, -6)).toContain('۶');
  });
});

describe('subscription labels', () => {
  it('maps status and plan', () => {
    expect(subscriptionStatusLabel('active')).toBe('فعال');
    expect(subscriptionStatusLabel('past_due')).toBe('پرداخت معوق');
    expect(planLabel('annual')).toBe('سالانه');
  });

  it('defaults an unknown status to رایگان rather than English', () => {
    expect(subscriptionStatusLabel('mystery')).toBe('رایگان');
  });
});

describe('navigation titles', () => {
  it('exposes Persian for every registered route', () => {
    for (const [route, title] of Object.entries(navTitles)) {
      expect(title).not.toMatch(LATIN);
      expect(navTitle(route as keyof typeof navTitles)).toBe(title);
    }
  });

  it('covers the specific titles that shipped in English', () => {
    expect(navTitle('Profile')).toBe('من');
    expect(navTitle('WellnessDashboard')).toBe('تاریخچه سلامت');
    expect(navTitle('CycleAnalysis')).toBe('چرخه من');
  });
});

/**
 * Medication enums (F-04).
 *
 * The Medications screen rendered `med.frequency` straight from the API, so a
 * Persian UI displayed «۱ · daily». These guard the boundary: a machine value
 * either maps to Persian or yields '', but never reaches the user as English.
 */
describe('medication enum labels', () => {
  // Every value the backend's FREQUENCY_CHOICES can produce.
  const BACKEND_FREQUENCIES = [
    'as_needed', 'daily', 'twice_daily', 'three_times_daily',
    'weekly', 'monthly', 'custom',
  ];

  it('maps every frequency the backend can send', () => {
    for (const code of BACKEND_FREQUENCIES) {
      const label = medicationFrequencyLabel(code);
      expect(label).not.toBe('');
      expect(label).not.toMatch(LATIN);
    }
  });

  it('translates the value that actually shipped to users', () => {
    expect(medicationFrequencyLabel('daily')).toBe('روزانه');
  });

  it('never leaks an unknown enum as English', () => {
    // A new backend choice must degrade to silence, not to a Latin string.
    expect(medicationFrequencyLabel('every_other_tuesday')).toBe('');
    expect(medicationFrequencyLabel(null)).toBe('');
    expect(medicationFrequencyLabel(undefined)).toBe('');
  });
});

/**
 * Persian numerals (F-04).
 *
 * MedicationsScreen and LogWellnessScreen did not import `toFa` at all, so
 * counts, reminder times and every metric value on the full log form rendered
 * in Latin digits inside a Persian-only UI.
 */
describe('Persian numerals for the values Wellness renders', () => {
  it('converts counts, including zero', () => {
    // «۰ داروی فعال» — the empty state that shipped as «0 داروی فعال».
    expect(toFa(0)).toBe('۰');
    expect(toFa(1)).toBe('۱');
    expect(toFa(84)).toBe('۸۴');
  });

  it('converts a reminder time without mangling the separator', () => {
    expect(toFa('08:00')).toBe('۰۸:۰۰');
  });

  it('converts decimal metric values', () => {
    expect(toFa('7.5')).toMatch(/^[۰-۹]٫?[۰-۹.]*$/u);
    expect(toFa('7.5')).not.toMatch(LATIN);
  });
});
