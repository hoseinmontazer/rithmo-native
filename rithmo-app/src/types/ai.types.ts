export interface AISuggestion {
  id: number;
  label: string;
  response_text: string;
  confidence: number;
  /** Short, feature-grounded explanation of why the model chose this label.
   *  Empty string for rule-based / safety-override paths (no model confidence). */
  rationale?: string;
  created_at: string;
  feedback?: boolean | null;
  corrected_label?: string;
  fallback?: boolean;
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
