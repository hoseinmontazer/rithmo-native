/**
 * cycleDayMap — per-date cycle classification, computed client-side from the
 * raw periods list.
 *
 * Extracted from CycleTrackerScreen (previously private there) so the Home
 * day strip can classify the same 11 dates the same way, rather than a
 * second, drifting copy of this logic. `buildCycleDateMap` is unchanged from
 * the original; `cycleDayForDate` is new, added for the day strip's hero
 * card (which needs "day N of the cycle" for a date the backend's
 * today-only `/intelligence/today/` context never covers).
 */
import { formatDateISO, daysBetween } from '@utils/dateUtils';

export type DayType =
  | 'period' | 'predicted_period' | 'follicular' | 'ovulation'
  | 'luteal' | 'pms' | 'late' | 'none';

export interface DayInfo {
  type: DayType;
  periodId?: number;
  isStart?: boolean;
  isEnd?: boolean;
  isOngoing?: boolean;
  label?: string;
}

/** Build a map of every date → phase info from the period list. */
export function buildCycleDateMap(periods: any[]): Map<string, DayInfo> {
  const map = new Map<string, DayInfo>();

  const sorted = [...periods].sort((a, b) =>
    a.start_date < b.start_date ? -1 : 1
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const startDate = new Date(p.start_date + 'T00:00:00');
    const isOngoing = !p.end_date;

    let redEnd: Date;
    if (p.end_date) {
      redEnd = new Date(p.end_date + 'T00:00:00');
    } else if (p.predicted_end_date) {
      redEnd = new Date(p.predicted_end_date + 'T00:00:00');
    } else {
      redEnd = new Date();
      redEnd.setHours(0, 0, 0, 0);
    }

    let nextStart: Date | null = null;
    if (p.next_period_start_date) {
      nextStart = new Date(p.next_period_start_date + 'T00:00:00');
    } else if (sorted[i + 1]) {
      nextStart = new Date(sorted[i + 1].start_date + 'T00:00:00');
    }

    const redEndStr = formatDateISO(redEnd);
    const cRed = new Date(startDate);
    while (cRed <= redEnd) {
      const key = formatDateISO(cRed);
      map.set(key, {
        type: 'period',
        periodId: p.id,
        isStart: key === p.start_date,
        isEnd: key === redEndStr,
        isOngoing,
      });
      cRed.setDate(cRed.getDate() + 1);
    }

    if (!nextStart || nextStart <= redEnd) continue;

    const pmsStart = new Date(nextStart);
    pmsStart.setDate(nextStart.getDate() - 5);

    let ovStart: Date | null = null;
    let ovEnd: Date | null = null;
    if (p.estimated_ovulation_date) {
      const ovDate = new Date(p.estimated_ovulation_date + 'T00:00:00');
      ovStart = p.fertile_window?.start
        ? new Date(p.fertile_window.start + 'T00:00:00')
        : new Date(ovDate.getTime() - 5 * 86400000);
      ovEnd = p.fertile_window?.end
        ? new Date(p.fertile_window.end + 'T00:00:00')
        : new Date(ovDate.getTime() + 86400000);
    }
    const boundaryOvStart = ovStart ?? pmsStart;
    const boundaryOvEnd = ovEnd ?? pmsStart;

    const dayAfterRed = new Date(redEnd);
    dayAfterRed.setDate(redEnd.getDate() + 1);

    const fCur = new Date(dayAfterRed);
    while (fCur < boundaryOvStart && fCur < nextStart) {
      const key = formatDateISO(fCur);
      if (!map.has(key)) map.set(key, { type: 'follicular', periodId: p.id });
      fCur.setDate(fCur.getDate() + 1);
    }

    if (ovStart && ovEnd) {
      const oCur = new Date(ovStart);
      while (oCur <= ovEnd && oCur < nextStart) {
        const key = formatDateISO(oCur);
        if (!map.has(key)) map.set(key, { type: 'ovulation', periodId: p.id });
        oCur.setDate(oCur.getDate() + 1);
      }
    }

    const lCur = new Date(boundaryOvEnd);
    lCur.setDate(lCur.getDate() + 1);
    while (lCur < pmsStart && lCur < nextStart) {
      const key = formatDateISO(lCur);
      if (!map.has(key)) map.set(key, { type: 'luteal', periodId: p.id });
      lCur.setDate(lCur.getDate() + 1);
    }

    const pCur = new Date(pmsStart);
    while (pCur < nextStart) {
      const key = formatDateISO(pCur);
      if (!map.has(key)) map.set(key, { type: 'pms', periodId: p.id });
      pCur.setDate(pCur.getDate() + 1);
    }

    if (i === sorted.length - 1 && p.next_period_start_date) {
      const predDur = p.period_duration ?? 5;
      const predEnd = new Date(nextStart);
      predEnd.setDate(nextStart.getDate() + predDur - 1);

      const predCur = new Date(nextStart);
      while (predCur <= predEnd) {
        const key = formatDateISO(predCur);
        if (!map.has(key)) {
          map.set(key, {
            type: nextStart < today ? 'late' : 'predicted_period',
            label: nextStart < today ? 'دوره با تأخیر' : 'دوره پیش‌بینی‌شده',
          });
        }
        predCur.setDate(predCur.getDate() + 1);
      }
    }
  }

  return map;
}

/**
 * "Day N" of the cycle containing `dateISO`, or null when `dateISO` falls
 * before the first logged period (no cycle to count from) or after the
 * last period with no next-period estimate to bound the current cycle —
 * in that second case the date is still inside SOME cycle, just one this
 * function refuses to guess the day count for past its own known bound.
 */
export function cycleDayForDate(dateISO: string, periods: any[]): number | null {
  const sorted = [...periods].sort((a, b) => (a.start_date < b.start_date ? -1 : 1));

  for (let i = 0; i < sorted.length; i++) {
    const start: string = sorted[i].start_date;
    const nextStart: string | null = sorted[i + 1]?.start_date ?? sorted[i].next_period_start_date ?? null;
    if (dateISO >= start && (!nextStart || dateISO < nextStart)) {
      return daysBetween(start, dateISO) + 1;
    }
  }
  return null;
}
