import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';

export interface SubscriptionStatus {
  plan:               string | null;
  status:             string;
  is_active:          boolean;
  provider?:          'stripe' | 'bazaar';
  current_period_end: string | null;
}

export interface VerifyBazaarPurchaseRequest {
  // Cosmetic only — the backend derives the real plan from product_id
  // (see subscriptions.views._plan_for_bazaar_sku), never from this field.
  plan:            string;
  product_id:      string;
  purchase_token:  string;
}

/** One admin-managed, purchasable Cafe Bazaar plan (subscriptions.models.Plan). */
export interface BazaarPlan {
  plan:     string;
  sku:      string;
  label_fa: string;
}

export const subscriptionService = {
  getStatus: () =>
    apiClient.get<SubscriptionStatus>(API_ENDPOINTS.SUBSCRIPTION_STATUS),

  // The current admin-managed Bazaar plan catalog — fetched fresh so a
  // plan added or retired via /ops/plans/ shows up without an app
  // release. See @utils/bazaarRestore's DEFAULT_BAZAAR_PLANS for the
  // offline fallback used if this call fails.
  getPlans: () =>
    apiClient.get<BazaarPlan[]>(API_ENDPOINTS.SUBSCRIPTION_PLANS),

  // Sends a Cafe Bazaar purchaseToken to the backend, which validates it
  // against Bazaar's own server API (never trust the token client-side)
  // before activating premium. Returns the resulting subscription state.
  verifyBazaarPurchase: (payload: VerifyBazaarPurchaseRequest) =>
    apiClient.post<SubscriptionStatus>(API_ENDPOINTS.SUBSCRIPTION_BAZAAR_VERIFY, payload),
};
