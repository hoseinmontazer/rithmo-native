/**
 * Today 2.1 — server question id -> mobile render mode.
 *
 * The real API contract audit (Phase D, docs/features/today-2.1-design.md)
 * found a genuine gap: `CheckInQuestion.options` is an EMPTY array for
 * four question ids whose real answer isn't a small server-provided list
 * at all (Q_SYMPTOM's vocabulary, Q_CONTEXT's tags, Q_SLEEP's numeric
 * value, Q_ANYTHING_ELSE's free text — see
 * intelligence/domain/checkin_engine.py's own QUESTION_BANK comments for
 * why each is deliberately empty there). An empty `options` array alone
 * is ambiguous between all four of those AND a genuine "no other choice"
 * case, so the mobile client cannot correctly render purely from the
 * response shape.
 *
 * Resolved entirely client-side, without any backend change: this is a
 * RENDERING decision (which control paints a given question), never a
 * branching/selection decision (which question comes next stays 100%
 * server-driven — see AdaptiveCheckInScreen, which never inspects a
 * question's id to decide what to submit or what comes after).
 */

export type CheckInRenderMode =
  | 'single_select'          // options come directly from the server response
  | 'multi_select_symptom'   // Q_SYMPTOM — options come from constants/symptoms.ts
  | 'single_select_context'  // Q_CONTEXT — options come from constants/contextTags.ts
  | 'numeric_sleep'          // Q_SLEEP — a numeric stepper, no fixed options
  | 'free_text';             // Q_ANYTHING_ELSE — a text field

const RENDER_MODE_BY_QUESTION_ID: Readonly<Record<string, CheckInRenderMode>> = {
  Q_OVERALL: 'single_select',
  Q_POSITIVE_WHAT: 'single_select',
  Q_ANYTHING_UNUSUAL: 'single_select',
  Q_DIMENSION: 'single_select',
  Q_ENERGY: 'single_select',
  Q_PAIN_SEVERITY: 'single_select',
  Q_PAIN_NEW_OR_RECURRING: 'single_select',
  Q_STRESS: 'single_select',
  Q_SYMPTOM: 'multi_select_symptom',
  Q_SYMPTOM_NEW: 'single_select',
  Q_CONTEXT: 'single_select_context',
  Q_SLEEP: 'numeric_sleep',
  Q_ANYTHING_ELSE: 'free_text',
};

/**
 * Throws for an unmapped question id rather than silently falling back
 * to a generic text input — an unknown answer type must fail loudly
 * during development, not render an incorrect control in production.
 */
export function renderModeForQuestion(questionId: string): CheckInRenderMode {
  const mode = RENDER_MODE_BY_QUESTION_ID[questionId];
  if (!mode) {
    throw new Error(
      `checkinQuestionRenderers: no render mode mapped for question id "${questionId}". ` +
      'Add it to RENDER_MODE_BY_QUESTION_ID — do not fall back to a generic control.'
    );
  }
  return mode;
}

/** For tests / defensive UI checks — never used to alter branching. */
export function isKnownCheckInQuestion(questionId: string): boolean {
  return questionId in RENDER_MODE_BY_QUESTION_ID;
}
