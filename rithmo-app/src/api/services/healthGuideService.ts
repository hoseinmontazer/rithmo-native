import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type { GuideArticle, GuideIndexPayload } from '@types/healthGuide.types';

interface Envelope<T> {
  status: string;
  data: T;
}

export const healthGuideService = {
  getIndex: () => apiClient.get<Envelope<GuideIndexPayload>>(API_ENDPOINTS.HEALTH_GUIDE),
  getArticle: (slug: string) =>
    apiClient.get<Envelope<GuideArticle>>(`${API_ENDPOINTS.HEALTH_GUIDE}${encodeURIComponent(slug)}/`),
  getMethods: () => apiClient.get<Envelope<GuideArticle>>(API_ENDPOINTS.HEALTH_GUIDE_METHODS),
};
