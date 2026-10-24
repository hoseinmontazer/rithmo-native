import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type { ReproductiveGoal, ReproductiveGoalPayload } from '@types/reproductiveGoal.types';

export const reproductiveGoalService = {
  get: () => apiClient.get<ReproductiveGoalPayload>(API_ENDPOINTS.REPRODUCTIVE_GOAL),

  set: (goal: ReproductiveGoal) =>
    apiClient.put<ReproductiveGoalPayload>(API_ENDPOINTS.REPRODUCTIVE_GOAL, { goal }),

  remove: () => apiClient.delete<ReproductiveGoalPayload>(API_ENDPOINTS.REPRODUCTIVE_GOAL),
};
