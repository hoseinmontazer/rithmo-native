/**
 * Types for the deterministic Monthly Review payload
 * (`/api/intelligence/review/monthly/`).
 *
 * Every number here is backend-computed — reused from the same domain
 * layer as the free pattern feed (`Insight`) and the Personalized Symptom
 * Forecast (`SymptomForecast`), never re-derived on-device. The AI
 * narrative built on top of this same data lives in
 * `aiReflection.types.ts` (`DailyReflection`, reused verbatim for the
 * monthly-review prose) — this type is the facts, that one is the summary.
 */
import type { Insight } from './intelligence.types';
import type { SymptomForecast } from './forecast.types';

export interface MonthlyReviewCycle {
  start: string;
  end: string;
  length: number;
  average_cycle_length: number | null;
  cycle_length_std_dev: number | null;
  regularity_score: number | null;
}

export interface MonthlySymptomFrequency {
  symptom: string;
  label_fa: string;
  days_logged: number;
  cycle_day_range: [number, number];
}

export interface MonthlyReviewChange {
  signal: string;
  direction: string;
  recent_mean: number;
  baseline_centre: number;
  window_days: number;
  is_adverse: boolean;
}

export interface MonthlyReviewNextCycle {
  predicted_next_period: string | null;
  symptom_forecasts: SymptomForecast[];
}

export interface MonthlyReviewPayload {
  learning_mode: boolean;
  /** null when the account is past Learning Mode overall but no single
   * cycle has closed yet — a real, valid state, not an error. */
  cycle: MonthlyReviewCycle | null;
  most_common_symptoms: MonthlySymptomFrequency[];
  biggest_changes: MonthlyReviewChange[];
  /**
   * Progressive Premium Value (docs/DECISIONS.md DEC-005): empty for a
   * free user even when real patterns exist — cycle/most_common_symptoms/
   * biggest_changes above are free for everyone; `patterns` and
   * `next_cycle_expectations` are the cross-cycle/predictive depth that
   * requires Premium. Only REPEATED/ESTABLISHED patterns — stricter than
   * the free pattern feed, which also shows EMERGING.
   */
  patterns: Insight[];
  next_cycle_expectations: MonthlyReviewNextCycle;
  still_learning: string[];
  coverage_message_fa: string | null;
  /** True only when real patterns/forecasts exist and the user isn't
   * Premium — never true while still in learning_mode. */
  premium_required: boolean;
  /** Present only alongside `premium_required: true`. */
  premium_teaser_fa?: string;
}
