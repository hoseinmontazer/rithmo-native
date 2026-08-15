/**
 * Lightweight date utilities — no heavy library dependency.
 */

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Format a Date as a YYYY-MM-DD calendar-date string using its LOCAL date
 * components — not `.toISOString()`, which always normalizes to UTC.
 *
 * `date.toISOString().split('T')[0]` gives the UTC calendar date of the
 * instant, which is a DIFFERENT day than the device's local calendar date
 * for a large fraction of every day in any timezone west of UTC (and a
 * smaller fraction east of it). Concretely: a user in US Pacific time
 * (UTC-8) picking "today" after 4pm local is already "tomorrow" in UTC —
 * every period/period-end date logged after that time each day would be
 * silently recorded one calendar day later than the day the user actually
 * picked. This is the single source every period/wellness date-string
 * builder in the app should go through.
 */
export function formatDateISO(date: Date): string {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayISO(): string {
  return formatDateISO(new Date());
}

export function daysBetween(from: string, to: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / msPerDay);
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return formatDateISO(date);
}
