export interface Period {
  id: number;
  start_date: string;
  end_date: string | null;
  symptoms: string;
  medication: string;
  cycle_length: number;
  period_duration: number;
  created_at?: string;
  updated_at?: string;
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

export interface CurrentStatus {
  is_on_period: boolean;
  current_day_of_period: number;
  cycle_day: number;
  phase: string;
  phase_description: string;
  days_until_next_period: number;
  is_fertile_window: boolean;
  cycle_length: number;
}

export interface CycleAnalysis {
  average_cycle: number | null;
  regularity_score: number | null;
  cycle_variations: any[];
  prediction_reliability: number | null;
  next_predicted_date: string;
  current_status: CurrentStatus;
  gender: string;
  // Legacy fields for backward compatibility
  average_cycle_length?: number;
  average_period_duration?: number;
  next_period_date?: string;
  current_phase?: CyclePhase;
  days_until_next_period?: number;
  ovulation_date?: string | null;
  fertile_window_start?: string | null;
  fertile_window_end?: string | null;
}

export type CyclePhase =
  | 'menstrual'
  | 'follicular'
  | 'ovulation'
  | 'luteal';

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
  period_id: number;
  ovulation_date: string;
  fertile_window_start: string;
  fertile_window_end: string;
  confidence: number;
}
