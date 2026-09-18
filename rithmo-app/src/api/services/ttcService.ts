import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type { TTCActionRequest, TTCStatusPayload } from '@types/ttc.types';

interface TTCEnvelope {
  status: string;
  data: TTCStatusPayload;
}

export const ttcService = {
  // Premium — P1.4.1. Reframes the existing fertile-window estimate and
  // cycle-analysis engine for a user trying to conceive; see
  // intelligence/services.py's ttc_status_payload().
  getStatus: () => apiClient.get<TTCEnvelope>(API_ENDPOINTS.INTELLIGENCE_TTC),

  sendAction: (payload: TTCActionRequest) =>
    apiClient.post<TTCEnvelope>(API_ENDPOINTS.INTELLIGENCE_TTC, payload),
};
