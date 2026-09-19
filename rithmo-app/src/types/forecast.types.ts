/**
 * Types for the Personalized Symptom Forecast (`/api/intelligence/forecast/`).
 *
 * A forecast projects an already-proven symptom-timing pattern (see
 * `Insight` in `intelligence.types.ts`, `kind: 'symptom'`) onto the cycle
 * already under way or the next predicted one. The client renders this
 * projection; it never computes one — `cycle_day_range`/`window_start_date`/
 * `window_end_date` are the backend's numbers, not derived on-device.
 */

/** Which occurrence this window belongs to. */
export type ForecastAnchor = 'current_cycle' | 'next_cycle' | 'unknown';

export interface SymptomForecast {
  key: string;
  source_insight_key: string;
  symptom: string;
  /** Full Persian sentence from the underlying pattern (e.g. "«گرفتگی»
   * بیشتر حول روز ۳ چرخه دیده می‌شود") — render as-is, never re-worded. */
  label_fa: string;
  confidence: 'repeated' | 'established';
  cycle_day_range: [number, number];
  anchor: ForecastAnchor;
  window_start_date: string | null;
  window_end_date: string | null;
  happening_now: boolean;
  evidence: Record<string, unknown>;
  /** Backend-owned uncertainty text — render verbatim, never strengthen. */
  uncertainty_note_fa: string;
}

export interface ForecastPayload {
  learning_mode: boolean;
  /** Empty for a free user even when real patterns exist — see
   * `forecast_count`/`premium_required` for that case (docs/DECISIONS.md
   * DEC-005 — Progressive Premium Value). Never a partial/fake preview. */
  forecasts: SymptomForecast[];
  /** How many real, established patterns exist — a true personalized
   * fact given to free users even when `forecasts` itself is withheld. */
  forecast_count: number;
  coverage_message_fa: string | null;
  /** True only when real patterns exist (`forecast_count > 0`) and the
   * asking user is not Premium — never true while still in
   * `learning_mode` or with a genuine `coverage_message_fa` (nothing to
   * gate yet either way). */
  premium_required: boolean;
  /** Present only alongside `premium_required: true` — the contextual
   * "می‌تونی X ببینی" invitation naming the real count. Absent (not an
   * empty string) when there's nothing yet to tease. */
  premium_teaser_fa?: string;
}
