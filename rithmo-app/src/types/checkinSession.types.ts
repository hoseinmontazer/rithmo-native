/**
 * Today 2.1 — Adaptive Daily Check-in session types.
 *
 * Mirrors the backend's actual response shape exactly (verified against
 * the real API, not just docs/features/today-2.1-design.md — see
 * intelligence/checkin_session_service.py::session_payload and
 * intelligence/views.py::CheckInSessionView/CheckInSessionAnswerView).
 * The mobile client never constructs or infers a question on its own —
 * every field here is server-authoritative.
 */

export interface CheckInQuestionOption {
  id: string;
  label_fa: string;
}

export interface CheckInQuestion {
  id: string;
  category: string;
  text_fa: string;
  /**
   * Empty for four question ids whose real option set lives on the
   * mobile side already (Q_SYMPTOM: `constants/symptoms.ts`, Q_CONTEXT:
   * `constants/contextTags.ts`, Q_SLEEP: a numeric stepper, no options at
   * all, Q_ANYTHING_ELSE: free text) — see
   * `screens/wellness/checkinQuestionRenderers.ts` for the exact,
   * explicit mapping. Every other question id's real options ARE this
   * array; never invent options for those.
   */
  options: CheckInQuestionOption[];
  multi_select: boolean;
  can_skip: boolean;
}

export type CheckInSessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface CheckInSessionState {
  session_id: number;
  date: string;
  status: CheckInSessionStatus;
  question_number: number;
  max_questions: number;
  completed: boolean;
  question: CheckInQuestion | null;
}

export interface SubmitCheckInAnswerParams {
  question_id: string;
  option_ids?: string[];
  skip?: boolean;
  raw_text?: string;
  date?: string;
}

/** The `{status:"error", code, message}` envelope every
 * checkin-session/answer/ 4xx/409 returns — see the design doc's error
 * table for the full `code` list. */
export interface CheckInSessionApiError {
  status: 'error';
  code: string;
  message: string;
}
