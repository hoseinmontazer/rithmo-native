export interface AISuggestion {
  id: number;
  label: string;
  response_text: string;
  confidence: number;
  created_at: string;
  feedback?: boolean | null;
  corrected_label?: string;
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
