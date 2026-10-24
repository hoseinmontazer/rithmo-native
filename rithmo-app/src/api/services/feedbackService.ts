import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type { FeedbackRequest, FeedbackResponse } from '@types/support.types';

export const feedbackService = {
  submit: (data: FeedbackRequest) =>
    apiClient.post<FeedbackResponse>(API_ENDPOINTS.SUPPORT_FEEDBACK, data),
};
