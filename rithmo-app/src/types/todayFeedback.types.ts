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

export interface TodayFeedbackResponse {
  available: boolean;
  feedback?: TodayFeedback;
  quota: TodayFeedbackQuota;
  /** Present only on a 429 (quota exhausted). */
  message?: string;
}
