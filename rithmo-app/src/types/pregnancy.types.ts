/**
 * Pregnancy status shape — mirrors
 * cycle_tracker.services.pregnancy_service.pregnancy_status_payload()
 * exactly. The backend is the source of truth for every date/week/day/
 * trimester value here; the client only ever displays what it's given.
 */
export interface PregnancyStatus {
  has_active_pregnancy: boolean;
  last_period_date?: string;
  due_date?: string;
  gestational_week?: number;
  gestational_day?: number;
  trimester?: 1 | 2 | 3;
  started_at?: string;
}

/** Exactly one of the two must be provided — never both, never neither. */
export interface StartPregnancyRequest {
  last_period_date?: string;
  due_date?: string;
}
