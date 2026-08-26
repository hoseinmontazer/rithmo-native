import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type { PregnancyStatus, StartPregnancyRequest } from '@types/pregnancy.types';

interface PregnancyEnvelope {
  status: string;
  data: PregnancyStatus;
}

export const pregnancyService = {
  getStatus: () => apiClient.get<PregnancyEnvelope>(API_ENDPOINTS.PREGNANCY),

  start: (payload: StartPregnancyRequest) =>
    apiClient.post<PregnancyEnvelope>(API_ENDPOINTS.PREGNANCY, payload),

  end: () => apiClient.post<PregnancyEnvelope>(API_ENDPOINTS.PREGNANCY_END, {}),
};
