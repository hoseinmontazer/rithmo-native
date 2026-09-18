/**
 * Types for TTC (Trying To Conceive) Mode
 * (`/api/intelligence/ttc/`, P1.4.1).
 *
 * A context/framing layer over the existing fertile-window estimate
 * (`@types/fertileWindow.types`) and cycle-analysis engine — not a new
 * fertility calculator. The client renders these fields as-is; it never
 * computes a date, a cycle count, or anything fertility-related
 * on-device.
 */
import type { FertileWindowPayload } from './fertileWindow.types';

export type TTCStatusValue = 'not_trying' | 'trying' | 'paused';

export interface TTCCycleSummary {
  average_cycle_length: number | null;
  cycle_length_std_dev: number | null;
  regularity_score: number | null;
  confidence_label: string | null;
}

export interface TTCStatusPayload {
  active: boolean;
  status: TTCStatusValue;
  /** Present only when `status` is `trying` or `paused`. */
  started_at: string | null;
  /** A plain count of logged cycles since `started_at` — never a
   *  probability, never computed on the client. */
  cycles_trying: number;
  /** Exactly what `/api/intelligence/fertile-window/` returns, embedded
   *  here for the backend contract's completeness — the mobile UI
   *  renders fertile-window data via the existing `FertileWindowCard`
   *  (its own hook/request), not by reading this nested field, so the
   *  two never risk drifting into two different UIs for the same data. */
  fertile_window: FertileWindowPayload | null;
  cycle_summary: TTCCycleSummary | null;
  /** Backend-owned medical disclaimer — always present, render verbatim. */
  disclaimer_fa: string;
}

export type TTCAction = 'start' | 'pause' | 'end';

export interface TTCActionRequest {
  action: TTCAction;
  /** Only meaningful with `action: 'start'`; ISO date (YYYY-MM-DD). */
  started_at?: string;
}
