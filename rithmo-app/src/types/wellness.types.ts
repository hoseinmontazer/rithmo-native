export interface WellnessLog {
  id: number;
  date: string;
  stress_level: number;       // 1-10
  sleep_hours: number;
  mood_level: number;         // 1-10
  energy_level: number;       // 1-10
  pain_level: number;         // 0-10
  exercise_minutes: number;
  nutrition_quality: number;  // 1-5
  caffeine_intake: number;
  alcohol_intake: number;
  smoking: number;
  anxiety_level: number;      // 1-10
  focus_level: number;        // 1-10
  notes: string;
  /**
   * Comma-separated canonical symptom codes. Kept for the wire format the
   * installed client renders; prefer `symptom_codes` in new code.
   */
  symptoms?: string;
  /** Canonical codes — what the server's pattern engine groups by. */
  symptom_codes?: string[];
  /** Persian labels for `symptom_codes`, resolved server-side. */
  symptoms_display?: string[];
  steps?: number;
  calories_burned?: number;
  calories_intake?: number;
  water_intake_ml?: number;
  // Computed scores returned by API
  wellness_score?: number;
  sleep_score?: number;
  activity_score?: number;
  mental_score?: number;
  user?: number;
  created_at?: string;
  updated_at?: string;
}

// Fields the server assigns a model default for when the client omits them
// (WellnessLog model defaults). Optional on the request so callers only send
// what they actually collected — QuickLog used to hardcode fabricated values
// here (audit 2026-08-20, finding H1).
type ServerDefaultedLogFields =
  | 'stress_level' | 'anxiety_level' | 'focus_level' | 'exercise_minutes'
  | 'nutrition_quality' | 'caffeine_intake' | 'alcohol_intake' | 'smoking';

export type CreateWellnessLogRequest = Omit<
  WellnessLog,
  | 'id' | 'date' | 'wellness_score' | 'sleep_score' | 'activity_score' | 'mental_score'
  | 'user' | 'created_at' | 'updated_at'
  | ServerDefaultedLogFields
> & Partial<Pick<WellnessLog, ServerDefaultedLogFields>>;
export type UpdateWellnessLogRequest = Partial<CreateWellnessLogRequest>;

// ── Wrapped API response shapes ───────────────────────────────────────────────

export interface WellnessApiResponse<T> {
  status: string;
  message?: string;
  data: T;
}

export interface WellnessInsight {
  category: string;
  type: 'positive' | 'negative' | 'neutral';
  message: string;
}

export interface WellnessAverages {
  wellness_score: number;
  sleep_hours: number;
  mood_level: number;
  energy_level: number;
  stress_level: number;
  anxiety_level: number;
  pain_level: number;
  steps: number;
  water_ml: number;
  exercise_minutes: number;
}

export interface WellnessAnalytics {
  period: {
    start_date: string;
    end_date: string;
    days: number;
    logs_count: number;
  };
  averages: WellnessAverages;
  trends: Record<string, unknown>;
  best_day: { date: string; wellness_score: number } | null;
  worst_day: { date: string; wellness_score: number } | null;
  insights: WellnessInsight[];
}

export interface WellnessStreaks {
  current_streak: number;
  longest_streak: number;
  total_logs: number;
  last_log_date: string | null;
}
