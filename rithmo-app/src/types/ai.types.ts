export interface AISuggestion {
  id: number;
  label: string;
  response_text: string;
  confidence: number;
  created_at: string;
  feedback?: boolean | null;
  corrected_label?: string;
  // True when this response came from the rule-based or error-fallback
  // path rather than the trained model — the UI should present these
  // with less confidence-implying styling than a real model prediction.
  fallback?: boolean;
  // True when a deterministic safety threshold (e.g. severe pain) fired
  // and produced this response before any model was consulted at all.
  safety_override?: boolean;
  model_version?: string;
}

export interface AISuggestionFeedbackRequest {
  feedback?: boolean;
  corrected_label?: string;
  response_text?: string;
}

export interface AIModelStatus {
  status: 'ready' | 'loading' | 'error';
  model_version: string;
  last_trained: string;
}

export interface AIDebugSuggestions {
  suggestions: AISuggestion[];
  model_status?: AIModelStatus;
  debug_info?: Record<string, unknown>;
}
