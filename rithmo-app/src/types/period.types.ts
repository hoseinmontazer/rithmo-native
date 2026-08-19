export interface Period {
  id: number;
  start_date: string;
  end_date: string | null;
  predicted_end_date?: string | null;
  next_period_start_date?: string | null;
  /** Backend-computed ovulation estimate for the cycle AFTER this period
   *  (next start - 14). Null when the backend has no reliable estimate
   *  (cycle gap outside the 15-60 day plausibility window, or ovulation
   *  would land before this period ends). The calendar must not recompute
   *  this locally. */
  estimated_ovulation_date?: string | null;
  /** Backend-computed fertile window for the cycle after this period
   *  ({start: ovulation-5, end: ovulation+1}). Null when there is no
   *  reliable ovulation estimate. */
  fertile_window?: { start: string; end: string } | null;
  symptoms: string;
  medication: string;
  cycle_length: number | null;
  period_duration: number | null;
  partner_name?: string | null;
  partner_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ActivePeriodError {
  error: string;
  active_period_id: number;
  start_date: string;
}

export interface CreatePeriodRequest {
  start_date: string;
  end_date?: string;
  symptoms?: string;
  medication?: string;
  cycle_length?: number;
  period_duration?: number;
}

export interface UpdatePeriodRequest extends Partial<CreatePeriodRequest> {
  period_id?: number;
}

/**
 * The phase of the cycle RIGHT NOW, as decided by the backend
 * (AnalyticsService.get_cycle_phase — the single source of truth).
 *
 * - menstrual / follicular / ovulation / luteal: inside a cycle
 * - expected:   the predicted start date is today
 * - late:       1-4 days past the predicted start date
 * - overdue:    5+ days past the predicted start date
 * - unknown:    no period data yet (the client must show a no-data
 *               state, NOT invent a phase)
 */
export type CyclePhase =
  | 'menstrual'
  | 'follicular'
  | 'ovulation'
  | 'luteal'
  | 'expected'
  | 'late'
  | 'overdue'
  | 'unknown';

export interface CurrentStatus {
  phase: CyclePhase;
  phase_description: string | null;
  /** Same text as phase_description; the key the client renders. */
  message: string | null;
  cycle_day: number | null;
  is_on_period: boolean;
  days_until_next_period: number | null;
  is_fertile_window: boolean;
  is_overdue: boolean;
  days_overdue: number;
  predicted_next_period: string | null;
  // Legacy fields for backward compatibility
  current_day_of_period?: number;
  cycle_length?: number;
}

export interface CycleAnalysis {
  // Current backend payload (/api/analytics/cycle/?mode=analysis)
  data_points: number;
  average_cycle_length: number | null;
  average_period_duration: number | null;
  cycle_length_std_dev: number | null;
  regularity_score: number | null;
  /** Numeric confidence in [0, 1] — float, never a string. */
  prediction_confidence: number;
  /** Human word for prediction_confidence: low / medium / high. */
  prediction_confidence_label: 'low' | 'medium' | 'high';
  cycle_lengths: number[];
  current_status: CurrentStatus;
  next_predicted_date: string | null;
  insights?: string[];
  warnings?: string[];
  gender?: string;
  // Legacy fields for backward compatibility
  average_cycle?: number | null;
  cycle_variations?: any[];
  prediction_reliability?: number | null;
  next_period_date?: string | null;
  current_phase?: CyclePhase;
  days_until_next_period?: number | null;
  ovulation_date?: string | null;
  fertile_window_start?: string | null;
  fertile_window_end?: string | null;
}

export interface CycleInsights {
  insights: string[];
  predictions: PredictionItem[];
}

export interface PredictionItem {
  date: string;
  type: string;
  description: string;
}

export interface WellnessCorrelation {
  correlations: CorrelationItem[];
}

export interface CorrelationItem {
  metric: string;
  phase: CyclePhase;
  correlation_score: number;
  description: string;
}

export interface SymptomPatterns {
  patterns: SymptomPattern[];
}

export interface SymptomPattern {
  symptom: string;
  frequency: number;
  most_common_phase: CyclePhase;
}

export interface OvulationPrediction {
  ovulation_date: string;
  fertile_window_start: string;
  fertile_window_end: string;
  /** Numeric confidence in [0, 1] — float, never a string, never NaN. */
  confidence: number;
  /** Human word for confidence: low / medium / high. */
  confidence_label?: 'low' | 'medium' | 'high' | string | null;
  period_id?: number; // legacy
}
