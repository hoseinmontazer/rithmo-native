/**
 * What a wellness form is allowed to send.
 *
 * Both logging screens prefill from a stored log through lossy display
 * conversions (QuickLog's energy/pain pickers are coarser than the stored
 * 0-10 scale) or clamps (LogWellness's sliders), and both start every
 * control at a plausible default. Sending the form as-is therefore wrote
 * values the user never chose: an untouched energy 7 came back as 8, an
 * untouched pain 4 as 5, sleep 6.5 as 7, and a full-form save overwrote
 * every metric of the day with slider defaults.
 *
 * The rule here: a field is sent only when the user edited it AND its value
 * now differs from what the form loaded. Everything else is omitted, and the
 * server keeps omitted fields exactly as stored (POST upsert and PATCH both
 * only write supplied fields and only extend `reported_fields` by them).
 *
 * Pure, so the rule is unit-tested without a renderer.
 */
import type { WellnessLog, CreateWellnessLogRequest } from '@types/wellness.types';
import { parseSymptomCodes } from '@constants/symptoms';

// ── Generic edited-and-changed selection ──────────────────────────────────

/**
 * The subset of `values` the user edited and actually changed. A key with no
 * baseline (nothing stored for it) counts as changed once edited — choosing
 * the value the control happened to start at is still a deliberate report.
 */
export function changedFields<T extends Record<string, unknown>>(
  values: T,
  edited: ReadonlySet<keyof T>,
  baseline: Partial<T>,
): Partial<T> {
  const out: Partial<T> = {};
  (Object.keys(values) as Array<keyof T>).forEach((key) => {
    if (!edited.has(key)) { return; }
    if (key in baseline && baseline[key] === values[key]) { return; }
    out[key] = values[key];
  });
  return out;
}

/** Order-insensitive equality for symptom code lists. */
export function sameSymptoms(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) { return false; }
  const set = new Set(a);
  return b.every((code) => set.has(code));
}

/** Canonical codes of a stored log; falls back to the legacy comma string. */
export function storedSymptoms(log: WellnessLog | null | undefined): string[] {
  if (!log) { return []; }
  return log.symptom_codes?.length ? [...log.symptom_codes] : parseSymptomCodes(log.symptoms);
}

/**
 * Whether a stored metric is a real report. Rows that predate provenance
 * tracking have no `reported_fields` at all; their stored values are treated
 * as reported, which only ever makes the form more conservative (the value is
 * shown and preserved, never replaced unless the user changes it).
 */
export function wasReported(log: WellnessLog, field: keyof WellnessLog): boolean {
  if (!Array.isArray(log.reported_fields)) { return log[field] !== null && log[field] !== undefined; }
  return log.reported_fields.includes(field);
}

// ── LogWellness's full form ───────────────────────────────────────────────

export type WellnessForm = {
  stress_level: number;
  sleep_hours: number;
  mood_level: number;
  energy_level: number;
  pain_level: number;
  exercise_minutes: number;
  nutrition_quality: number;
  caffeine_intake: number;
  alcohol_intake: number;
  smoking: number;
  anxiety_level: number;
  focus_level: number;
  notes: string;
};

/**
 * The request body for a LogWellness save: only the fields the user edited
 * and changed from what the form loaded (`baseline`; empty for a new report),
 * plus symptoms only when the selection differs from what was stored. The
 * form's slider defaults and prefill clamps (stress 0 shown as 1, sleep 14
 * shown as 12) therefore never reach the server.
 */
export function buildLogWellnessPayload(
  form: WellnessForm,
  edited: ReadonlySet<keyof WellnessForm>,
  baseline: Partial<WellnessForm>,
  symptoms: readonly string[],
  symptomsBaseline: readonly string[],
): Partial<WellnessForm> & { symptoms?: string } {
  const payload: Partial<WellnessForm> & { symptoms?: string } = changedFields(form, edited, baseline);
  if (!sameSymptoms(symptoms, symptomsBaseline)) {
    payload.symptoms = symptoms.join(',');
  }
  return payload;
}

// ── QuickLog's four pickers ───────────────────────────────────────────────

export type QuickMetric = 'mood' | 'energy' | 'pain' | 'sleep';
export const QUICK_METRICS: readonly QuickMetric[] = ['mood', 'energy', 'pain', 'sleep'];

export const QUICK_METRIC_FIELD = {
  mood: 'mood_level',
  energy: 'energy_level',
  pain: 'pain_level',
  sleep: 'sleep_hours',
} as const;

/** What each picker shows when nothing has been reported for it today. */
export const QUICK_DEFAULTS: Record<QuickMetric, number> = { mood: 3, energy: 3, pain: 0, sleep: 7 };

/** The sleep stepper's range; it moves in half-hour steps. */
export const QUICK_SLEEP_MIN = 3;
export const QUICK_SLEEP_MAX = 12;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Stored value → the nearest value its picker can show. Display only. */
export function quickDisplayValue(metric: QuickMetric, stored: number): number {
  switch (metric) {
    case 'mood': return clamp(Math.round(stored), 1, 5);
    case 'energy': return clamp(Math.round(stored / 2), 1, 5);
    case 'pain': return clamp(Math.round(stored / 2.5), 0, 4);
    case 'sleep': return clamp(Math.round(stored * 2) / 2, QUICK_SLEEP_MIN, QUICK_SLEEP_MAX);
  }
}

/** Picker value → the stored scale. Applied only to values the user changed. */
export function quickStoredValue(metric: QuickMetric, display: number): number {
  switch (metric) {
    case 'mood': return display;
    case 'energy': return display * 2;
    case 'pain': return Math.round(display * 2.5);
    case 'sleep': return display;
  }
}

/** What the form loaded for one day: the comparison point for "changed". */
export interface QuickLogBaseline {
  /** Picker value of each reported metric; absent = nothing stored to keep. */
  metrics: Partial<Record<QuickMetric, number>>;
  symptoms: string[];
  notes: string;
}

export const EMPTY_QUICK_BASELINE: QuickLogBaseline = { metrics: {}, symptoms: [], notes: '' };

export function quickLogBaseline(log: WellnessLog | null | undefined): QuickLogBaseline {
  if (!log) { return EMPTY_QUICK_BASELINE; }
  const metrics: Partial<Record<QuickMetric, number>> = {};
  QUICK_METRICS.forEach((metric) => {
    const field = QUICK_METRIC_FIELD[metric];
    const stored = log[field];
    if (typeof stored === 'number' && wasReported(log, field)) {
      metrics[metric] = quickDisplayValue(metric, stored);
    }
  });
  return { metrics, symptoms: storedSymptoms(log), notes: log.notes ?? '' };
}

export interface QuickLogDraft {
  date: string;
  values: Record<QuickMetric, number>;
  touched: Record<QuickMetric, boolean>;
  symptoms: string[];
  notes: string;
}

/**
 * The POST body for a QuickLog save. Always carries the day the form was
 * loaded for; otherwise only what the user changed. A stored value the
 * pickers cannot represent (energy 7, pain 4, sleep 13) survives every save
 * that does not change that picker.
 */
export function buildQuickLogPayload(draft: QuickLogDraft, baseline: QuickLogBaseline): CreateWellnessLogRequest {
  const edited = new Set(QUICK_METRICS.filter((m) => draft.touched[m]));
  const changed = changedFields(draft.values, edited, baseline.metrics);
  const payload: CreateWellnessLogRequest = { date: draft.date };
  (Object.keys(changed) as QuickMetric[]).forEach((metric) => {
    (payload as Record<string, unknown>)[QUICK_METRIC_FIELD[metric]] = quickStoredValue(metric, changed[metric] as number);
  });
  if (!sameSymptoms(draft.symptoms, baseline.symptoms)) {
    payload.symptoms = draft.symptoms.join(',');
  }
  if (draft.notes !== baseline.notes) {
    payload.notes = draft.notes;
  }
  return payload;
}

/** Metric fields a payload reports (for count-only telemetry). */
export function reportedMetricCount(payload: CreateWellnessLogRequest): number {
  return QUICK_METRICS.filter((m) => QUICK_METRIC_FIELD[m] in payload).length;
}

// ── QuickLog lifecycle ────────────────────────────────────────────────────

/**
 * Whether QuickLog should start a fresh form when it regains focus: after a
 * completed save (so the success view is never shown stale on reopen), or
 * when the local calendar day has rolled over since the form was loaded (so
 * a form loaded for one day is never saved onto another). Otherwise an
 * unsaved draft survives tab switches and navigation.
 */
export function shouldResetQuickLog(state: { saved: boolean; formDate: string; today: string }): boolean {
  return state.saved || state.formDate !== state.today;
}

// ── Context entries ───────────────────────────────────────────────────────

export interface ContextEntryDraft<Tag extends string = string> {
  date: string;
  tag: Tag;
  raw_text?: string;
}

export const contextEntryKey = (e: ContextEntryDraft) => `${e.date}|${e.tag}|${e.raw_text ?? ''}`;

/**
 * The context entries a save still has to create. `alreadyCreated` holds the
 * keys this form already wrote successfully, so a retry after a partial
 * failure, or a second tap on Save, never writes the same event twice. It is
 * scoped to one form session and cleared when the form resets: two separate
 * check-ins with the same tag on one day remain two events, as the model
 * intends (a day can hold more than one entry per tag).
 */
export function pendingContextEntries<Tag extends string>(
  entries: readonly ContextEntryDraft<Tag>[],
  alreadyCreated: ReadonlySet<string>,
): ContextEntryDraft<Tag>[] {
  return entries.filter((e) => !alreadyCreated.has(contextEntryKey(e)));
}

/**
 * QuickLog's tag selection as entries: one per tag; the optional note rides
 * on the first tag only; a note with no tag becomes a single `fallbackTag`
 * ('other') entry so
 * free text is never dropped.
 */
export function contextEntriesFor<Tag extends string>(
  date: string,
  tags: readonly Tag[],
  note: string,
  fallbackTag: Tag,
): ContextEntryDraft<Tag>[] {
  const text = note.trim();
  const list: readonly Tag[] = tags.length > 0 ? tags : (text ? [fallbackTag] : []);
  return list.map((tag, index) => ({
    date,
    tag,
    ...(index === 0 && text ? { raw_text: text } : {}),
  }));
}
