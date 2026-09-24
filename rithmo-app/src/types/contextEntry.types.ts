/**
 * Today 2.0 contextual events — mirrors cycle_tracker.models.ContextEntry
 * exactly. Deliberately separate from symptoms: a tag here describes a
 * surrounding circumstance (illness, medication, travel, ...), never
 * "what the body did" (that stays SymptomEntry, unchanged).
 */
export type ContextTag =
  | 'illness'
  | 'medication'
  | 'unusual_stress'
  | 'unusual_positive'
  | 'sleep_disruption'
  | 'travel'
  | 'lifestyle_change'
  | 'other';

export interface ContextEntry {
  id: number;
  date: string;
  tag: ContextTag;
  raw_text: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContextEntryRequest {
  date: string;
  tag: ContextTag;
  raw_text?: string;
}

export interface UpdateContextEntryRequest {
  tag?: ContextTag;
  raw_text?: string;
}

export interface ContextEntryApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  errors?: Record<string, string[]>;
}
