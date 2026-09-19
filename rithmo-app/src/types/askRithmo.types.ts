/**
 * Ask Rithmo ("از داده‌های من بپرس") — mirrors the backend response
 * envelope exactly (ai_gateway/views.py::AskRithmoView). The backend is
 * the sole author of every field here; the client renders them, it never
 * recomputes a statistic or invents a stronger claim than `answer_fa`
 * already makes.
 */

/** The fixed, small intent surface — see ai_gateway/ask_rithmo_intent.py.
 * "unsupported" is a valid, expected outcome, not an error. */
export type AskRithmoIntent =
  | 'cycle_length'
  | 'symptom_pattern'
  | 'symptom_timing'
  | 'pain_trend'
  | 'what_changed'
  | 'general_knowledge'
  | 'unsupported';

/**
 * Native vocabulary per intent family — deliberately NOT unified into one
 * scale (see ai_gateway/ask_rithmo_context.py's own reasoning): cycle
 * stats use the existing low/medium/high prediction-confidence words,
 * pattern-based intents use the existing insufficient/emerging/repeated/
 * established words, and knowledge/unsupported answers carry none.
 */
export type AskRithmoDataSufficiency =
  | 'low' | 'medium' | 'high'
  | 'insufficient' | 'emerging' | 'repeated' | 'established'
  | null;

export interface AskRithmoAnswer {
  intent: AskRithmoIntent;
  answer_fa: string;
  observations_fa: string[];
  suggestion_fa: string | null;
  data_sufficiency: AskRithmoDataSufficiency;
  /** False for "unsupported" and for a knowledge answer/miss — neither
   * reads the user's own tracked data. */
  has_personal_data: boolean;
  /**
   * Progressive Premium Value (docs/DECISIONS.md DEC-005): true only for
   * the four historical/comparative intents (symptom_pattern,
   * symptom_timing, pain_trend, what_changed) when the asking user is
   * not Premium. The endpoint itself is free — a basic current-cycle
   * fact and general-knowledge answers always come through with this
   * false. When true, `answer_fa` already contains the contextual
   * "این نیاز به پرمیوم دارد" explanation naming what was asked for; no
   * separate teaser field exists for this endpoint.
   */
  premium_required: boolean;
  disclaimer_fa: string | null;
}

export type AskRithmoResponse =
  | ({ available: true } & AskRithmoAnswer)
  | { available: false };
