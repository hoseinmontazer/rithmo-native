/**
 * The client half of the product-event contract.
 *
 * Mirrors `analytics/events.py` on the server. The server is the enforcing
 * side — it allowlists names and filters property keys — but the types here
 * make the correct call the easy one, so a developer has to work at it to
 * send something that will be stripped.
 *
 * The rule these types encode: **analytics records behaviour, never a
 * measurement of the user's body.** There is no permitted property anywhere
 * below for mood, energy, pain, sleep, symptoms, notes, cycle length or
 * dates. If a new event needs one of those to be useful, the event is
 * wrong — not the contract.
 */

export type EventName =
  | 'app_opened'
  | 'screen_viewed'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'home_viewed'
  | 'insight_viewed'
  | 'insight_explanation_opened'
  | 'insight_action_started'
  | 'insight_action_completed'
  | 'insight_action_dismissed'
  | 'daily_log_opened'
  | 'daily_log_submitted'
  | 'pattern_viewed'
  | 'cycle_viewed'
  | 'period_logged'
  | 'partner_home_viewed'
  | 'partner_support_action_viewed'
  | 'subscription_viewed'
  | 'subscription_action_started'
  | 'subscription_restore_started'
  | 'subscription_restored'
  | 'subscription_restore_failed'
  | 'notification_opened';

/** Scalars only — nested values are dropped server-side. */
export type EventPropValue = string | number | boolean | null;

/**
 * Per-event property shapes. Every field is an identifier, a bounded enum,
 * or a count.
 */
export interface EventProps {
  app_opened: { cold_start?: boolean };
  screen_viewed: { route: string };
  onboarding_started: Record<string, never>;
  onboarding_completed: { role: 'owner' | 'partner'; steps_completed?: number };

  home_viewed: {
    learning_mode?: boolean;
    has_primary_insight?: boolean;
    action_count?: number;
  };

  /** `insight_key` identifies which RULE fired, not the user's values. */
  insight_viewed: { insight_key: string; insight_kind?: string; confidence?: string };
  insight_explanation_opened: { insight_key: string; insight_kind?: string };
  insight_action_started: { intervention: string; slot?: string };
  insight_action_completed: { intervention: string; slot?: string; helpfulness?: number };
  insight_action_dismissed: { intervention: string; slot?: string };

  daily_log_opened: { is_edit?: boolean };
  /** How MANY fields were filled — never which, never the values. */
  daily_log_submitted: { field_count?: number; had_symptoms?: boolean };

  pattern_viewed: { insight_count?: number; maturity?: string };

  cycle_viewed: { has_data?: boolean };
  period_logged: { is_edit?: boolean };

  partner_home_viewed: { has_partner?: boolean; is_shared?: boolean };
  partner_support_action_viewed: { theme?: string };

  subscription_viewed: { is_active?: boolean; feature_name?: string };
  subscription_action_started: { plan?: string };
  subscription_restore_started: Record<string, never>;
  subscription_restored: Record<string, never>;
  /** `reason` is which of the pure BazaarRestoreResult kinds it was — never a raw error message. */
  subscription_restore_failed: { reason?: string };

  notification_opened: { notification_type?: string };
}

/** The wire shape sent to `/api/analytics/events/`. */
export interface AnalyticsEvent {
  name: EventName;
  timestamp: string;
  session_id: string;
  anonymous_id: string;
  screen?: string;
  app_version: string;
  platform: string;
  props: Record<string, EventPropValue>;
}
