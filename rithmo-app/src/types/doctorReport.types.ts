/**
 * Doctor Health Report (P0.8) — mirrors the backend response envelope
 * exactly (intelligence/services.py::doctor_report_payload). This is a
 * conversation aid for a clinician visit, not a diagnosis: the client
 * renders OBSERVATION / MEDICAL INFORMATION / FOLLOW-UP as three
 * separate sections and never merges them into one block of prose.
 */
import type { Maturity } from './intelligence.types';
import type { MonthlyReviewChange } from './monthlyReview.types';

export interface DoctorReportCycleSummary {
  average_cycle_length: number;
  recent_cycle_lengths: number[];
  cycle_length_std_dev: number | null;
  average_period_duration: number | null;
  regularity_score: number | null;
  confidence_label: 'low' | 'medium' | 'high';
}

export interface DoctorReportSymptomPattern {
  symptom: string;
  symptom_label_fa: string | null;
  cycle_day_range: [number, number] | null;
  cycles_observed: number | null;
  confidence: 'repeated' | 'established';
  confidence_label_fa: string;
}

export type DoctorReportPainStatus = 'no_data' | 'stable' | 'deviation';

export interface DoctorReportPainSummary {
  status: DoctorReportPainStatus;
  direction?: 'above' | 'below';
  recent_mean?: number;
  baseline_centre?: number;
  is_adverse?: boolean;
  window_days?: number;
}

export interface DoctorReportObservation {
  /** Free for every user (docs/DECISIONS.md DEC-005) — the same numbers
   * Ask Rithmo's CYCLE_LENGTH and Monthly Review already give away. */
  cycle_summary: DoctorReportCycleSummary | null;
  /** Empty, and `pain_summary` null, for a free user — see
   * `DoctorReportPayload.premium_required`/`premium_teaser_fa` for that
   * case. Never a partial/fake preview of these. */
  symptom_patterns: DoctorReportSymptomPattern[];
  pain_summary: DoctorReportPainSummary | null;
  recent_changes: MonthlyReviewChange[];
}

export interface DoctorReportMedicalInformation {
  title_fa: string;
  short_summary_fa: string;
  evidence_level: 'A' | 'B' | 'C';
  claim_strength: string;
}

export interface DoctorReportPayload {
  /** Reuses intelligence.domain.state.Maturity's own three words
   * verbatim — never a new vocabulary invented for this report. */
  data_sufficiency: Maturity;
  report_period: { start: string | null; end: string };
  tracking_coverage: {
    total_logs: number;
    total_periods: number;
    usable_cycles: number;
    first_log_date: string | null;
    last_log_date: string | null;
  };
  observation: DoctorReportObservation;
  /** Empty for a free user — see `premium_required`. */
  medical_information: DoctorReportMedicalInformation[];
  /** Discussion prompts, not diagnoses — render verbatim. Empty for a
   * free user — see `premium_required`. */
  follow_up: string[];
  coverage_message_fa: string | null;
  /**
   * Progressive Premium Value (docs/DECISIONS.md DEC-005): true when the
   * asking user isn't Premium — `symptom_patterns`/`pain_summary`/
   * `recent_changes`/`medical_information`/`follow_up` above are empty/
   * null in that case; `report_period`/`tracking_coverage`/
   * `observation.cycle_summary` remain free and populated regardless.
   */
  premium_required: boolean;
  /** Present only alongside `premium_required: true` and only once the
   * user has cleared Learning Mode (nothing to tease before then
   * either — see `coverage_message_fa`). */
  premium_teaser_fa?: string;
}
