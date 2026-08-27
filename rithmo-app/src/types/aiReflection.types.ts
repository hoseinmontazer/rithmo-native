/**
 * AI Daily Reflection — mirrors the backend's response envelope exactly
 * (ai_gateway/views.py). The backend is the sole author of `reflection`;
 * this type only describes what the client may read, never compute.
 */
export interface DailyReflection {
  summary: string;
  observations: string[];
  suggestion: string;
  limitations: string[];
}

export interface DailyReflectionResponse {
  available: boolean;
  reflection?: DailyReflection;
}
