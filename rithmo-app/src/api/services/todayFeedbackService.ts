import { apiClient } from '@api/client';
import { todayISO } from '@utils/dateUtils';
import { API_ENDPOINTS } from '@constants/config';
import type { TodayFeedbackResponse } from '@types/todayFeedback.types';

export const todayFeedbackService = {
  /**
   * Operates on the device's local "today" (sent as `date`; the server
   * accepts only +-1 day of its own date, because the wellness log is
   * keyed by the device-local date). No free historical date. A
   * 429 (quota exhausted) still resolves with a real body
   * ({ status, message, quota }), which the caller reads from the
   * rejected promise's `error.response.data`.
   */
  requestFeedback: () =>
    apiClient
      .post<TodayFeedbackResponse>(API_ENDPOINTS.AI_TODAY_FEEDBACK, { date: todayISO() })
      .then((r) => r.data),
};
