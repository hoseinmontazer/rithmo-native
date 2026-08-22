/**
 * i18n — the transformation boundary between API values and Persian UI.
 *
 * The rule this module enforces:
 *
 *     API code/value  →  client mapping  →  Persian UI string
 *
 * A user-facing component must never render a string it received from the
 * server. The backend returns English prose in several places
 * (`current_status.phase_description` = "Day 1 of your period.",
 * `prediction_confidence_label` = "medium"); those fields are for machines
 * and logs. The client composes its own sentence from the *code* beside
 * them (`phase`, `cycle_day`).
 *
 * Every mapper falls back to a safe Persian string rather than echoing the
 * unknown input, so a new backend enum value can never leak English into
 * the UI — it degrades to "نامشخص" instead.
 */

import { toFa } from '@utils/persian';
import {
  confidenceLabels,
  medicationFrequencyLabels,
  medicationUnitLabels,
  navTitles,
  phaseLabels,
  phasePlainLabels,
  planLabels,
  signalLabels,
  subscriptionStatusLabels,
  type NavRouteName,
} from './strings.fa';

export { navTitles };
export type { NavRouteName };

/** Persian title for a navigation route. */
export function navTitle(route: NavRouteName): string {
  return navTitles[route];
}

/** «متوسط» for `medium`. Unknown values yield '' so nothing English shows. */
export function confidenceLabel(raw?: string | null): string {
  if (!raw) { return ''; }
  return confidenceLabels[raw.toLowerCase()] ?? '';
}

/** Clinical phase name, e.g. «لوتئال». */
export function phaseLabel(raw?: string | null): string {
  if (!raw) { return phaseLabels.unknown; }
  return phaseLabels[raw.toLowerCase()] ?? phaseLabels.unknown;
}

/** Everyday phase wording, e.g. «هفته‌های پیش از دوره». */
export function phasePlainLabel(raw?: string | null): string {
  if (!raw) { return phasePlainLabels.unknown; }
  return phasePlainLabels[raw.toLowerCase()] ?? phasePlainLabels.unknown;
}

/**
 * The client's own sentence for "where am I in my cycle", built from the
 * machine-readable `phase` + `cycle_day`.
 *
 * This replaces rendering `current_status.phase_description`, which is
 * English prose written for logs and shipped verbatim to Persian users
 * ("Day 1 of your period.").
 */
export function phaseDescription(
  phase?: string | null,
  cycleDay?: number | null,
  daysUntilNextPeriod?: number | null,
): string {
  const p = (phase ?? '').toLowerCase();
  const day = typeof cycleDay === 'number' && cycleDay > 0 ? toFa(cycleDay) : null;

  switch (p) {
    case 'menstrual':
      return day ? `روز ${day} دوره‌ات` : 'در روزهای دوره‌ای';
    case 'follicular':
      return 'نیمه اول چرخه — بدنت در حال آماده‌شدن است.';
    case 'ovulation':
      return 'روز تخمین‌زده‌شده‌ی تخمک‌گذاری.';
    case 'luteal':
      return 'نیمه دوم چرخه، بعد از تخمک‌گذاری.';
    case 'expected':
      return 'بر اساس چرخه‌هایت، دوره‌ات امروز مورد انتظار است.';
    case 'late':
      return typeof daysUntilNextPeriod === 'number' && daysUntilNextPeriod < 0
        ? `دوره‌ات ${toFa(Math.abs(daysUntilNextPeriod))} روز دیرتر از پیش‌بینی است.`
        : 'دوره‌ات کمی دیرتر از پیش‌بینی است.';
    case 'overdue':
      return typeof daysUntilNextPeriod === 'number' && daysUntilNextPeriod < 0
        ? `دوره‌ات ${toFa(Math.abs(daysUntilNextPeriod))} روز عقب افتاده است.`
        : 'دوره‌ات از پیش‌بینی عقب افتاده است.';
    default:
      return 'هنوز اطلاعات کافی برای تعیین وضعیت چرخه نداریم.';
  }
}

/** «خلق» for `mood`. Unknown keys fall back to the code, never English prose. */
export function signalLabel(raw?: string | null): string {
  if (!raw) { return ''; }
  return signalLabels[raw.toLowerCase()] ?? raw;
}

export function subscriptionStatusLabel(raw?: string | null): string {
  if (!raw) { return subscriptionStatusLabels.free; }
  return subscriptionStatusLabels[raw.toLowerCase()] ?? subscriptionStatusLabels.free;
}

export function planLabel(raw?: string | null): string {
  if (!raw) { return ''; }
  return planLabels[raw.toLowerCase()] ?? '';
}

/** «روزانه» for `daily`. Unknown values yield '' so nothing English shows. */
export function medicationFrequencyLabel(raw?: string | null): string {
  if (!raw) { return ''; }
  return medicationFrequencyLabels[raw.toLowerCase()] ?? '';
}

/** «قرص» for `tablet`. Unknown units yield '' rather than leaking English. */
export function medicationUnitLabel(raw?: string | null): string {
  if (!raw) { return ''; }
  return medicationUnitLabels[raw.toLowerCase()] ?? '';
}
