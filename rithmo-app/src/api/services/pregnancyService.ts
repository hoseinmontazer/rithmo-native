import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type { PregnancyStatus, StartPregnancyRequest } from '@types/pregnancy.types';
import type { PregnancyTimelinePayload } from '@types/pregnancyTimeline.types';

interface PregnancyEnvelope {
  status: string;
  data: PregnancyStatus;
}

interface PregnancyTimelineEnvelope {
  status: string;
  data: PregnancyTimelinePayload;
}

export const pregnancyService = {
  getStatus: () => apiClient.get<PregnancyEnvelope>(API_ENDPOINTS.PREGNANCY),

  start: (payload: StartPregnancyRequest) =>
    apiClient.post<PregnancyEnvelope>(API_ENDPOINTS.PREGNANCY, payload),

  end: () => apiClient.post<PregnancyEnvelope>(API_ENDPOINTS.PREGNANCY_END, {}),

  // Premium — P1.3. Reframes the same status this service already
  // fetches as a deterministic timeline; see
  // intelligence/services.py's pregnancy_timeline_payload().
  getTimeline: () =>
    apiClient.get<PregnancyTimelineEnvelope>(API_ENDPOINTS.INTELLIGENCE_PREGNANCY),
};
