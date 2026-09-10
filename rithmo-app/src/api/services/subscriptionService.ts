import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';

export interface SubscriptionStatus {
  plan:               string | null;
  status:             string;
  is_active:          boolean;
  provider?:          'stripe' | 'bazaar' | 'zibal';
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

export interface RequestZibalPaymentRequest {
  plan: 'monthly' | 'annual';
}

/**
 * Everything needed to open the Zibal payment page — never a price or
 * merchant id, both of which stay server-side (subscriptions/zibal.py).
 * payment_url is just gateway.zibal.ir/start/{track_id}; opening it (with
 * the required Referer header) is this app's job, done in
 * ZibalPaymentScreen.
 */
export interface RequestZibalPaymentResponse {
  order_ref:    string;
  track_id:     number;
  amount_rial:  number;
  plan:         string;
  payment_url:  string;
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

  // Starts a Zibal payment session — the server resolves the real price
  // from ZIBAL_PRICE_MONTHLY_RIAL / ZIBAL_PRICE_ANNUAL_RIAL; this call
  // never sends an amount. Activation itself happens later, server-side,
  // when Zibal's callback verifies the completed payment — this call
  // only starts the session.
  requestZibalPayment: (payload: RequestZibalPaymentRequest) =>
    apiClient.post<RequestZibalPaymentResponse>(API_ENDPOINTS.SUBSCRIPTION_ZIBAL_REQUEST, payload),
};
