/**
 * Pure decision logic for the Cafe Bazaar restore-purchase flow.
 *
 * Kept free of any React Native / Poolakey import on purpose: the SDK call
 * itself (bazaarBilling.restoreBazaarPurchases) can only be exercised on a
 * device or emulator with Bazaar installed, but *what we do with its
 * result* — deciding which of the 402/409/network/success outcomes to
 * report — is ordinary data-in, data-out logic and is unit-tested here.
 */
/** The shape both the fetched Plan catalog and DEFAULT_BAZAAR_PLANS share. */
export interface BazaarPlanLookup {
  plan: string;
  sku:  string;
}

/** Reverse-map a Bazaar SKU back to a plan id, against whichever plan
 * catalog is currently known (the fetched admin-managed list, or the
 * offline DEFAULT_BAZAAR_PLANS fallback — see @constants/config). The
 * backend derives the real plan from product_id itself and ignores the
 * "plan" field in the request body — this only fills that field for the
 * request's own type, it is never trusted for billing logic. */
export function planForBazaarSku(plans: readonly BazaarPlanLookup[], productId: string): string | null {
  return plans.find((p) => p.sku === productId)?.plan ?? null;
}

/** Result of POSTing one purchase to /api/subscriptions/bazaar/verify/. */
export interface BazaarVerifyOutcome {
  ok: boolean;
  /** HTTP status of a failed verify call, when the server responded at all. */
  status?: number;
  /** True when the request never reached the server (no response at all). */
  networkError?: boolean;
}

export type BazaarRestoreResult =
  | { kind: 'no_purchases' }
  | { kind: 'restored' }
  | { kind: 'expired' }
  | { kind: 'owned_by_other' }
  | { kind: 'network_error' }
  | { kind: 'unknown_error' };

/**
 * Reduce the per-purchase verify outcomes (a Bazaar account can in
 * principle have more than one relevant subscription on record) into one
 * result for the UI. Priority: any success wins outright — restoring
 * three purchases where one succeeds is still a successful restore.
 */
export function summarizeBazaarRestore(outcomes: BazaarVerifyOutcome[]): BazaarRestoreResult {
  if (outcomes.length === 0) { return { kind: 'no_purchases' }; }
  if (outcomes.some((o) => o.ok)) { return { kind: 'restored' }; }
  if (outcomes.some((o) => o.status === 409)) { return { kind: 'owned_by_other' }; }
  if (outcomes.some((o) => o.status === 402)) { return { kind: 'expired' }; }
  if (outcomes.some((o) => o.networkError || (o.status !== undefined && o.status >= 500))) {
    return { kind: 'network_error' };
  }
  return { kind: 'unknown_error' };
}

export function bazaarRestoreMessage(result: BazaarRestoreResult): string {
  switch (result.kind) {
    case 'no_purchases':
      return 'خرید فعالی برای این حساب کافه‌بازار پیدا نشد.';
    case 'restored':
      return 'اشتراک شما با موفقیت بازیابی شد.';
    case 'expired':
      return 'خرید قبلی شما منقضی شده است.';
    case 'owned_by_other':
      return 'این خرید قبلاً برای حساب دیگری در ریتمو فعال شده است.';
    case 'network_error':
      return 'اتصال به کافه‌بازار یا سرور برقرار نشد. دوباره تلاش کن.';
    case 'unknown_error':
      return 'بازیابی خرید انجام نشد. دوباره تلاش کن.';
  }
}
