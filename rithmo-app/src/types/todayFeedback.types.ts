/**
 * Today AI Feedback ("بازخورد امروز") — Today 2.0, Layer B. Mirrors the
 * backend's response envelope exactly (ai_gateway/views.py
 * ::TodayFeedbackView). Same DAILY_REFLECTION_SCHEMA shape as every other
 * AI narrative in this app (see aiReflection.types.ts) — only the extra
 * `quota` block is new.
 */
export interface TodayFeedback {
  summary: string;
  observations: string[];
  suggestion: string;
  limitations: string[];
}

export interface TodayFeedbackQuota {
  is_premium: boolean;
  /** null for Premium — unrestricted, never a large number to special-case. */
  limit: number | null;
  used: number | null;
  remaining: number | null;
}

/** Deterministic result built from the same facts when the AI path gives
 * nothing (backend ai_gateway/today_feedback_fallback.py). */
export interface TodayFeedbackFallback {
  observations: string[];
  suggestion: string | null;
}

export interface TodayFeedbackResponse {
  available: boolean;
  feedback?: TodayFeedback;
  fallback?: TodayFeedbackFallback;
  quota: TodayFeedbackQuota;
  /** Present only on a 429 (quota exhausted). */
  message?: string;
}
