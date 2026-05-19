import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type {
  AIDebugSuggestions,
  AISuggestion,
  AISuggestionFeedbackRequest,
  AIModelStatus,
} from '@types/ai.types';

export const aiService = {
  getSuggestion: () =>
    apiClient.get<AISuggestion>(API_ENDPOINTS.AI_SUGGESTIONS),

  getSuggestionHistory: () =>
    apiClient.get<AISuggestion[]>(API_ENDPOINTS.AI_SUGGESTION_HISTORY),

  submitFeedback: (id: number, data: AISuggestionFeedbackRequest) =>
    apiClient.post<AISuggestion>(`/api/ai/feedback/${id}/`, data),

  getModelStatus: () =>
    apiClient.get<AIModelStatus>(API_ENDPOINTS.AI_MODEL_STATUS),

  getDebugSuggestions: () =>
    apiClient.get<AIDebugSuggestions>(API_ENDPOINTS.AI_DEBUG_SUGGESTIONS),
};
