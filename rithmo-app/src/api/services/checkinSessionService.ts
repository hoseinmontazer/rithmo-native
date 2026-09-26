import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type { CheckInSessionState, SubmitCheckInAnswerParams } from '@types/checkinSession.types';

interface CheckInSessionApiResponse {
  status: 'success';
  data: CheckInSessionState;
}

function unwrap(r: { data: CheckInSessionApiResponse }): CheckInSessionState {
  return r.data.data;
}

export const checkinSessionService = {
  /**
   * Idempotent start/resume — GET-or-create today's session and return
   * the server-recomputed current question (or the completed state).
   * The mobile client never constructs a question locally.
   */
  getToday: () =>
    apiClient
      .get(API_ENDPOINTS.CHECKIN_SESSION_TODAY)
      .then((r) => unwrap(r)),

  /**
   * Answer or skip the CURRENT question only — the server rejects
   * (409 `question_mismatch`) any `question_id` that isn't the session's
   * actual current question, so the caller must reconcile via
   * `getToday()` on that specific error rather than retry blindly. See
   * docs/features/today-2.1-design.md's Phase B API Contract for the
   * full error table.
   */
  submitAnswer: (params: SubmitCheckInAnswerParams) =>
    apiClient
      .post(API_ENDPOINTS.CHECKIN_SESSION_ANSWER, params)
      .then((r) => unwrap(r)),
};
