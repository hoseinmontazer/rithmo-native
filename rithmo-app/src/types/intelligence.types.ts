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

export type InsightKind = 'deviation' | 'phase' | 'recurrence' | 'relationship' | 'symptom' | 'coverage';

/**
 * What the engine is entitled to claim about its own evidence — a
 * different axis from `kind` (source) and `confidence` (evidence tier).
 * `null` for a `coverage` insight, which makes no claim about the body.
 */
export type EpistemicKind = 'observation' | 'hypothesis' | 'pattern';

export interface Insight {
  key: string;
  kind: InsightKind;
  confidence: InsightConfidence;
  confidence_label_fa: string;
  epistemic_kind: EpistemicKind | null;
  epistemic_kind_label_fa: string;
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

/** Backend-computed yesterday->today comparison (or null). Structured on
 * purpose: the client words it. `up` = today's value is higher. */
export interface ContinuityPayload {
  signal: 'mood' | 'energy' | 'pain' | 'sleep' | 'stress';
  direction: 'up' | 'down';
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

/**
 * The honest, evolving thing Rhythmo says before it has a real Insight to
 * lead with — see `intelligence/domain/noticing.py` on the server. Every
 * decision about WHICH signal/mechanism this concerns, and whether a real
 * Insight should be shown instead, is made server-side; the client only
 * ever renders `headline_fa` verbatim. Never present alongside
 * `primary_insight` — the server only computes one when the other is null.
 */
export type NoticingMechanism = 'signal' | 'symptom' | 'cycle' | 'empty';
export type NoticingTier = 'empty' | 'one_point' | 'two_point' | 'range' | 'baseline';

export interface NoticingPayload {
  key: string;
  mechanism: NoticingMechanism;
  tier: NoticingTier;
  headline_fa: string;
  basis: Record<string, unknown>;
  related_signals: string[];
  onboarding_reference: string | null;
}

export type CheckInKind = 'missing_data' | 'deviation_confirm' | 'partner_support';
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
  noticing: NoticingPayload | null;
  continuity?: ContinuityPayload | null;
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
  /** General (never personal) phase knowledge, addressed to the partner —
   * shown only while phase sharing is on. */
  general_context: string[] | null;
  themes: string[];
  /** One deterministic PartnerAction value, only for a real (non-neutral)
   * theme — never invented, never LLM-derived. */
  suggested_action: string | null;
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
  check_in: CheckIn | null;
  /**
   * Partner 2.0 P1 freshness / data-quality contract. All three are additive
   * and optional: a server that predates P1 omits them, and the client then
   * treats the payload as plain usable content (see partnerTodayContent.ts).
   */
  /** The server's calendar date for this payload (ISO yyyy-mm-dd). */
  as_of?: string;
  /**
   * What the partner can be told right now: `ready` = real shared context,
   * `low_data` = the owner has recorded something but nothing usable is
   * shared/derivable yet, `no_data` = nothing recorded at all yet.
   */
  data_state?: 'ready' | 'low_data' | 'no_data';
  /** P3: the owner's one-tap reaction to the partner's latest gesture (last
   * 24h, this relationship), or null. Just the reaction and which gesture. */
  support_response?: { reaction: SupportReaction; action: string } | null;
  freshness?: {
    /** How current the owner's wellbeing logging is; null when wellbeing is
     * not shared. A coarse bucket - never a date or a count. */
    wellbeing: 'today' | 'recent' | 'stale' | 'none' | null;
  };
}

/** What recording a support action returns: the record, never owner data. */
export interface PartnerActionRecord {
  action: string;
  /** Server timestamp of the record. */
  recorded_at: string;
  /** True when the server folded this into an identical recent call. */
  deduplicated: boolean;
}

/** The two gestures an owner can ever see. `gave_space` and `message` never
 * produce a receipt (see backend intelligence/support_receipts.py). */
export type SupportReceiptKind = 'checked_in' | 'time_together';
export type SupportReaction = 'heart' | 'thanks' | 'hug';

/** The owner's ONE small receipt. Carries the gesture kind and nothing else:
 * no names, no context, no health data. */
export interface SupportReceipt {
  id: number;
  kind: SupportReceiptKind;
  state: 'new' | 'seen';
  created_at: string;
}

export type PartnerTodayResponse =
  | { status: 'success'; data: PartnerTodayPayload }
  | { status: 'no_partner'; message: string; data?: null }
  | { status: 'not_shared'; message: string; data: null };
