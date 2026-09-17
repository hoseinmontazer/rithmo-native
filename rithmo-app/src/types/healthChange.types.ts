/**
 * Types for Health Change Detection + Pain/PMS Intelligence
 * (`/api/intelligence/health-changes/`, P1.2).
 *
 * A curated Premium digest over the SAME deviation/phase/recurrence/
 * symptom `Insight`s the free `/api/intelligence/insights/` feed already
 * computes (see `@types/intelligence.types`) — not a new insight model.
 * The client renders these as-is; it never computes a baseline, a
 * deviation, or a confidence tier on-device.
 */
import type { Insight } from './intelligence.types';

export interface HealthChangePayload {
  learning_mode: boolean;
  /** Strongest first, same ordering `compute_insights()` already applies. */
  health_changes: Insight[];
  /** Set only when there is nothing to show yet — learning mode, or
   * established but nothing currently qualifies. Render verbatim, never
   * replace with a fabricated "all good" message. */
  coverage_message_fa: string | null;
  /** Backend-owned medical disclaimer — always present, render verbatim. */
  disclaimer_fa: string;
}
