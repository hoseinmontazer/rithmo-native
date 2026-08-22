/**
 * insightsEngine.ts — local derivations that have no server equivalent.
 *
 * This file used to hold the app's own pattern engine. It no longer does.
 *
 * Pattern CLAIMS — "your energy is lower in this phase", "this symptom
 * clusters around day N" — now come from `/api/intelligence/`, because a
 * claim about the user has to be computed once, in one place. Deriving it
 * here as well meant the phone and the server could reach different
 * conclusions from the same data, and it left every rule unavailable to
 * notifications and to the partner experience. The server versions are
 * also evidence-carrying (each claim ships the numbers behind it), which
 * a local recomputation cannot reproduce for a claim it did not make.
 *
 * What remains here is presentation-layer maths that asserts nothing about
 * the user: correlations and week-over-week comparison for the premium
 * Deep Insights screen, a symptom frequency count, and the shared mood
 * scale. If any of these grows into a claim, it belongs on the server.
 */
import type { WellnessLog } from '@types/wellness.types';
import type { Period } from '@types/period.types';
import { daysBetween, addDays, todayISO } from '@utils/dateUtils';
import { parseSymptomCodes } from '@constants/symptoms';
import { toFa } from '@utils/persian';

// ── Public types ─────────────────────────────────────────────────────────────

export interface Correlation {
  aKey: string;
  bKey: string;
  aLabel: string;
  bLabel: string;
  r: number;
  n: number;
  strength: 'strong' | 'moderate' | 'weak';
  direction: 'positive' | 'negative';
}

export interface WeekCompareItem {
  label: string;
  thisWeek: number;
  lastWeek: number;
  delta: number;
  unit: string;
  higherIsBetter: boolean;
}

export interface SymptomTrend {
  name: string;
  count: number;
  pct: number;
}

// ── Small math helpers ───────────────────────────────────────────────────────

function avg(nums: number[]): number | null {
  if (nums.length === 0) { return null; }
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** QuickLog sends mood on a 1–5 scale; the type allows 1–10. Normalize. */
export function mood5(value: number | undefined | null): number | null {
  if (value == null || value <= 0) { return null; }
  return value <= 5 ? Math.round(value) : Math.min(5, Math.round(value / 2));
}

/**
 * Canonical symptom codes for a log.
 *
 * Prefers the server's `symptom_codes` list and falls back to parsing the
 * comma-separated wire field, which older rows and older app builds still
 * carry. Both are normalised through the shared vocabulary so a Persian
 * label written by an old build and the code written by a new one count as
 * the same symptom.
 */
export function parseSymptoms(
  log: Pick<WellnessLog, 'symptoms' | 'symptom_codes'>,
): string[] {
  if (log.symptom_codes?.length) { return log.symptom_codes; }
  return parseSymptomCodes(log.symptoms);
}

/**
 * Cycle day for a log date, 1-indexed from the latest period start.
 * Returns null when no period has started before that date.
 */
export function cycleDayOf(
  dateStr: string,
  periods: Period[],
  avgCycleLength: number | null,
): number | null {
  let best: Period | null = null;
  for (const p of periods) {
    if (p.start_date <= dateStr && (!best || p.start_date > best.start_date)) {
      best = p;
    }
  }
  if (!best) { return null; }
  const day = daysBetween(best.start_date, dateStr) + 1;
  if (day < 1) { return null; }
  const cycleLen = best.cycle_length ?? avgCycleLength ?? null;
  // A log far beyond the expected cycle end (no newer period) still belongs
  // to this cycle, but cap it so bucket analyses stay sane.
  return cycleLen ? Math.min(day, cycleLen + 7) : day;
}

// ── Correlations (deep insights, premium) ────────────────────────────────────

export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3 || n !== ys.length) { return null; }
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  if (den === 0) { return null; }
  return num / den;
}

const CORRELATION_PAIRS: [keyof WellnessLog, string, keyof WellnessLog, string][] = [
  ['sleep_hours', 'خواب', 'mood_level', 'خلق'],
  ['sleep_hours', 'خواب', 'energy_level', 'انرژی'],
  ['sleep_hours', 'خواب', 'stress_level', 'استرس'],
  ['mood_level', 'خلق', 'energy_level', 'انرژی'],
  ['stress_level', 'استرس', 'pain_level', 'درد'],
  ['mood_level', 'خلق', 'pain_level', 'درد'],
];

export function computeCorrelations(logs: WellnessLog[], minN = 8): Correlation[] {
  const out: Correlation[] = [];
  for (const [aKey, aLabel, bKey, bLabel] of CORRELATION_PAIRS) {
    const pts = logs
      .filter((l) => l[aKey] != null && l[bKey] != null)
      .map((l) => [Number(l[aKey]), Number(l[bKey])] as const);
    if (pts.length < minN) { continue; }
    const r = pearson(pts.map((p) => p[0]), pts.map((p) => p[1]));
    if (r === null || Math.abs(r) < 0.3) { continue; }
    out.push({
      aKey: String(aKey),
      bKey: String(bKey),
      aLabel,
      bLabel,
      r,
      n: pts.length,
      strength: Math.abs(r) >= 0.7 ? 'strong' : Math.abs(r) >= 0.4 ? 'moderate' : 'weak',
      direction: r >= 0 ? 'positive' : 'negative',
    });
  }
  return out.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}

/** Honest, human Persian sentence for a correlation row. */
export function correlationSentence(c: Correlation): string {
  const strengthTxt = c.strength === 'strong' ? 'قوی' : c.strength === 'moderate' ? 'متوسط' : 'ضعیف';
  const dirTxt = c.direction === 'positive' ? 'مثبت' : 'منفی';
  const moreLess = c.direction === 'positive' ? 'بیشتر' : 'کمتر';
  return `ارتباط ${strengthTxt} و ${dirTxt} بین ${c.aLabel} و ${c.bLabel}: هرچه ${c.aLabel} ${moreLess} باشد، ${c.bLabel} هم ${moreLess} می‌شود. (r = ${toFa(Math.abs(c.r).toFixed(2))})`;
}

// ── Week-over-week comparison (deep insights, premium) ───────────────────────

export function computeWeekComparison(logs: WellnessLog[]): WeekCompareItem[] {
  const today = todayISO();
  const thisLogs = logs.filter((l) => l.date >= addDays(today, -6) && l.date <= today);
  const lastLogs = logs.filter((l) => l.date >= addDays(today, -13) && l.date <= addDays(today, -7));
  if (thisLogs.length < 2 || lastLogs.length < 2) { return []; }

  const rows: [string, (l: WellnessLog) => number | null, string, boolean][] = [
    ['خواب', (l) => (l.sleep_hours > 0 ? l.sleep_hours : null), 'ساعت', true],
    ['خلق', (l) => mood5(l.mood_level), '', true],
    ['انرژی', (l) => (l.energy_level > 0 ? l.energy_level : null), '', true],
    ['استرس', (l) => (l.stress_level > 0 ? l.stress_level : null), '', false],
    ['درد', (l) => l.pain_level, '', false],
  ];

  const items: WeekCompareItem[] = [];
  for (const [label, fn, unit, higherIsBetter] of rows) {
    const thisVals = thisLogs.map(fn).filter((v): v is number => v !== null);
    const lastVals = lastLogs.map(fn).filter((v): v is number => v !== null);
    const t = avg(thisVals);
    const p = avg(lastVals);
    if (t === null || p === null) { continue; }
    items.push({ label, thisWeek: t, lastWeek: p, delta: t - p, unit, higherIsBetter });
  }
  return items;
}

// ── Symptom trends (history screen) ──────────────────────────────────────────

export function computeSymptomTrends(logs: WellnessLog[], top = 5): SymptomTrend[] {
  const counts = new Map<string, number>();
  for (const l of logs) {
    for (const s of parseSymptoms(l)) {
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  }
  const total = logs.length || 1;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([name, count]) => ({ name, count, pct: count / total }));
}

// ── Mood meta (shared by QuickLog + MoodTimeline) ────────────────────────────

export const MOODS = [
  { level: 1, emoji: '😔', label: 'سنگین' },
  { level: 2, emoji: '😕', label: 'کمی بد' },
  { level: 3, emoji: '😐', label: 'معمولی' },
  { level: 4, emoji: '🙂', label: 'خوب' },
  { level: 5, emoji: '😊', label: 'عالی' },
] as const;
