import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type { TodayFeedbackResponse } from '@types/todayFeedback.types';

export const todayFeedbackService = {
  /**
   * Always operates on the server's own "today" — there is no date
   * parameter, by design (see ai_gateway/today_feedback_context.py). A
   * 429 (quota exhausted) still resolves with a real body
   * ({ status, message, quota }), which the caller reads from the
   * rejected promise's `error.response.data`.
   */
  requestFeedback: () =>
    apiClient
      .post<TodayFeedbackResponse>(API_ENDPOINTS.AI_TODAY_FEEDBACK)
      .then((r) => r.data),
};
