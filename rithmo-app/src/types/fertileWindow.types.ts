/**
 * Types for Fertile Window Intelligence (`/api/intelligence/fertile-window/`, P1.1).
 *
 * A confidence-graded reframing of the existing
 * `PredictionService.predict_ovulation()` estimate — not a new fertility
 * algorithm. The client renders these fields as-is; it never computes a
 * date, a confidence, or a probability on-device.
 */

/** Reused verbatim from cycle_tracker.services.confidence — never a new scale. */
export type FertilityConfidence = 'low' | 'medium' | 'high';

/** "personal_average" once a real personal-history estimate exists,
 * "insufficient_data" only while there isn't yet enough history to
 * attempt one (Maturity.LEARNING). Never implies precision. */
export type FertileWindowBasis = 'personal_average' | 'insufficient_data';

/** Reused verbatim from intelligence.domain.state.Maturity. */
export type DataSufficiency = 'learning' | 'building' | 'established';

export interface FertileWindowPayload {
  fertile_window_start: string | null;
  fertile_window_end: string | null;
  estimated_ovulation_day: string | null;
  confidence: FertilityConfidence | null;
  basis: FertileWindowBasis;
  data_sufficiency: DataSufficiency;
  /** Backend-owned, shown only when there is a real reason to caution —
   * render verbatim, never strengthen or drop. */
  reliability_note_fa: string | null;
  /** Backend-owned medical disclaimer — always present, render verbatim. */
  disclaimer_fa: string;
}
