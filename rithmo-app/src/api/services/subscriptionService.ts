import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';

export interface SubscriptionStatus {
  plan:               string | null;
  status:             string;
  is_active:          boolean;
  current_period_end: string | null;
}

export const subscriptionService = {
  getStatus: () =>
    apiClient.get<SubscriptionStatus>(API_ENDPOINTS.SUBSCRIPTION_STATUS),
};
