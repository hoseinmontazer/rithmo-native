/**
 * Types for Pregnancy Intelligence Mode + Timeline
 * (`/api/intelligence/pregnancy/`, P1.3).
 *
 * Reframes the SAME data `/api/pregnancy/` already returns (see
 * `@types/pregnancy.types`'s `PregnancyStatus`, backed by
 * `cycle_tracker.services.pregnancy_service`) as a small deterministic
 * timeline — not a second pregnancy data source. The client renders
 * these as-is; it never computes week/day/trimester/due-date itself.
 */

export type PregnancyTimelineMilestoneState = 'past' | 'current' | 'upcoming';

export interface PregnancyTimelineMilestone {
  key: 'started' | 'trimester_1' | 'trimester_2' | 'trimester_3' | 'due_date';
  label_fa: string;
  state: PregnancyTimelineMilestoneState;
  /** Present only for milestones with a real, safe single date
   *  ("started", "due_date"); the three trimester milestones are ranges
   *  and never carry one. */
  date?: string;
}

export interface PregnancyTimelinePayload {
  active: boolean;
  current_week?: number;
  current_day?: number;
  trimester?: 1 | 2 | 3;
  due_date?: string;
  /** Empty when `active` is false. */
  timeline: PregnancyTimelineMilestone[];
  /** Backend-owned; always present, render verbatim. */
  disclaimer_fa: string;
}
