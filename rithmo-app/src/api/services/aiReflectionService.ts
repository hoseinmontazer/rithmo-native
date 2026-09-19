import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type { DailyReflectionResponse } from '@types/aiReflection.types';

export const aiReflectionService = {
  getDailyReflection: () =>
    apiClient.get<DailyReflectionResponse>(API_ENDPOINTS.AI_DAILY_REFLECTION),

  getPartnerReflection: () =>
    apiClient.get<DailyReflectionResponse>(API_ENDPOINTS.AI_PARTNER_REFLECTION),

  getCycleChangeReview: () =>
    apiClient.get<DailyReflectionResponse>(API_ENDPOINTS.AI_CYCLE_CHANGE_REVIEW),

  getWeeklyReview: () =>
    apiClient.get<DailyReflectionResponse>(API_ENDPOINTS.AI_WEEKLY_REVIEW),

  getMonthlyReview: () =>
    apiClient.get<DailyReflectionResponse>(API_ENDPOINTS.AI_MONTHLY_REVIEW),

  getDoctorReport: () =>
    apiClient.get<DailyReflectionResponse>(API_ENDPOINTS.AI_DOCTOR_REPORT),
};
