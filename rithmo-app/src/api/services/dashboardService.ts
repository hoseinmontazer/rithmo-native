import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';

export const dashboardService = {
  getCorrelations: () =>
    apiClient.get<any>(API_ENDPOINTS.DASHBOARD_CORRELATIONS),

  getComparison: () =>
    apiClient.get<any>(API_ENDPOINTS.DASHBOARD_COMPARISON),
};
