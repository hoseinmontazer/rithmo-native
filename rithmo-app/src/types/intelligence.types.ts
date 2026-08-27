/**
 * Types for the personal-intelligence API (`/api/intelligence/`).
 *
 * These mirror the server's domain layer deliberately closely, because the
 * layering they encode is the product contract, not an implementation
 * detail:
 *
 *   explicit  → what the user reported
 *   derived   → what deterministic logic computed from it
 *   pattern   → what repeated across enough history to be called a pattern
 *
 * The client renders these; it does not re-derive them. Patterns used to be
 * computed on the phone (utils/insightsEngine.ts), which meant the device
 * and the server could reach different conclusions about the same user, and
 * neither notifications nor the partner experience could reuse any of it.
 */

/** How strongly a claim is supported. Never invent a stronger word. */
export type InsightConfidence =
  | 'insufficient'
  | 'emerging'
  | 'repeated'
  | 'established';

export type InsightKind = 'deviation' | 'phase' | 'symptom' | 'coverage';

export interface Insight {
  key: string;
  kind: InsightKind;
  confidence: InsightConfidence;
  confidence_label_fa: string;
  title_fa: string;
  body_fa: string;
  /** The numbers behind the claim — shown when the user asks "why?". */
  evidence: Record<string, unknown>;
  related_signals: string[];
  window_days: number | null;
  priority: number;
  first_seen?: string;
  times_seen?: number;
  peak_confidence?: InsightConfidence;
  /** The user's own verdict on whether this matches their real experience.
   * `null` = not yet asked/answered — distinct from a dismiss (hard hide). */
  accurate?: boolean | null;
}

export type ActionSlot = 'primary' | 'supporting' | 'reflection';
export type ActionStatus = 'completed' | 'skipped' | 'dismissed';
/** 1 = helped, 0 = no difference, -1 = did not help. */
export type Helpfulness = 1 | 0 | -1;

export interface ActionFeedback {
  status: ActionStatus;
  helpfulness: Helpfulness | null;
  note: string;
}

export interface GuidedAction {
  id: number;
  date: string;
  slot: ActionSlot;
  intervention: string;
  title_fa: string;
  description_fa: string;
  minutes: number | null;
  category: string;
  /** The "why am I seeing this?" answer, frozen at issue time. */
  reason_fa: string;
  reason_trace: Record<string, unknown>;
  source_insight_key: string | null;
  feedback: ActionFeedback | null;
}

export type Maturity = 'learning' | 'building' | 'established';

export interface CycleContextPayload {
  /** What she is told about today — may be a phase or a lifecycle state. */
  phase: string;
  phase_label_fa: string;
  /**
   * The biological phase used for GROUPING observations. Lifecycle states
   * ("late", "overdue") collapse to the underlying phase here, and an
   * implausible cycle collapses to "unknown" — so this is what plain-language
   * phase wording should be derived from.
   */
  pattern_phase: string;
  cycle_day: number | null;
  days_until_next_period: number | null;
  is_on_period: boolean;
  is_fertile_window: boolean;
  predicted_next_period: string | null;
  prediction_confidence: number | null;
  prediction_confidence_label: string | null;
  usable_cycles: number;
  is_known: boolean;
}

export interface EvidencePayload {
  total_logs: number;
  total_periods: number;
  usable_cycles: number;
  logs_in_window: number;
  first_log_date: string | null;
  last_log_date: string | null;
  recent_log_days: number;
}

export interface BaselinePayload {
  signal: string;
  centre: number;
  spread: number;
  usual_range: [number, number];
  observations: number;
  window: [string, string];
}

export interface DeviationPayload {
  signal: string;
  direction: 'above' | 'below' | 'within';
  recent_mean: number;
  baseline_centre: number;
  delta: number;
  sigma: number | null;
  recent_observations: number;
  baseline_observations: number;
  window_days: number;
  is_adverse: boolean;
}

/**
 * Per-signal progress toward a baseline.
 *
 * Real counts only — `observations` is days she actually logged and
 * `required` is the engine's threshold. A signal absent from the map has no
 * progress to report and must render no bar rather than an empty one.
 */
export interface LearningProgressPayload {
  observations: number;
  required: number;
}

export interface PersonalStatePayload {
  today: string;
  maturity: Maturity;
  cycle: CycleContextPayload;
  baselines: {
    baselines: Record<string, BaselinePayload>;
    deviations: Record<string, DeviationPayload>;
    /** Signals she logs but which don't have enough history yet. */
    learning: string[];
    learning_progress: Record<string, LearningProgressPayload>;
  };
  evidence: EvidencePayload;
  today_values: Record<string, number>;
  today_symptoms: string[];
  tracked_signals: string[];
}

export interface GeneralPhaseContext {
  phase: string;
  general_context_fa: string[];
  suggested_logging: string[];
}

export type CheckInKind = 'missing_data' | 'deviation_confirm';
export type CheckInState = 'shown' | 'answered' | 'dismissed';

export interface CheckInOption {
  label_fa: string;
  value: string;
}

export interface CheckIn {
  id: number;
  kind: CheckInKind;
  question_fa: string;
  options: CheckInOption[];
  state: CheckInState;
  answer_value: string | null;
}

export interface TodayPayload {
  state: PersonalStatePayload;
  learning_mode: boolean;
  general_context: GeneralPhaseContext | null;
  check_in: CheckIn | null;
  primary_insight: Insight | null;
  insights: Insight[];
  actions: GuidedAction[];
}

export interface ProgressPayload {
  maturity: Maturity;
  evidence: EvidencePayload;
  signals_tracked: string[];
  baselines_established: string[];
  still_learning: string[];
  patterns_by_confidence: Partial<Record<InsightConfidence, number>>;
  actions_completed: number;
  what_has_helped: Array<{
    intervention: string;
    completed: number;
    net_helpfulness: number;
  }>;
}

// ── Partner ──────────────────────────────────────────────────────────────────

/**
 * What a partner receives. Note what is absent: no insight feed, no
 * baselines, no per-day values, no notes, no symptoms. The server is the
 * authority on that boundary — this type documents it, it does not
 * enforce it.
 */
export interface PartnerTodayPayload {
  owner_name: string;
  cycle: {
    phase?: string;
    phase_label_fa?: string;
    is_on_period?: boolean;
    days_until_next_period?: number;
  } | null;
  themes: string[];
  context: Array<{
    theme: string;
    signal: string;
    direction: string;
    /** Coarse bucket only — the partner never receives the numbers. */
    magnitude: 'somewhat' | 'notably';
  }>;
  suggestions: string[];
  sharing: {
    period_status: boolean;
    upcoming_period: boolean;
    wellbeing: boolean;
    mood: boolean;
  };
  disclaimer_fa: string;
}

export type PartnerTodayResponse =
  | { status: 'success'; data: PartnerTodayPayload }
  | { status: 'no_partner'; message: string; data?: null }
  | { status: 'not_shared'; message: string; data: null };
