/**
 * Cafe Bazaar in-app billing (Poolakey wrapper).
 *
 * Thin wrapper around @cafebazaar/react-native-poolakey scoped to what
 * Rithmo needs: subscribe to a plan (by its real Bazaar SKU) and read
 * the real Bazaar price for a set of SKUs so the price shown in the app
 * matches Bazaar's own client (Cafe Bazaar's payment rules require
 * these to be equal). The resulting purchaseToken is never trusted
 * client-side — it's sent to subscriptionService.verifyBazaarPurchase,
 * which checks it against Bazaar's server API before granting premium
 * access.
 *
 * Every function here takes the SKU string directly rather than a
 * fixed plan-id union — the plan catalog itself is admin-managed
 * (subscriptions.models.Plan, fetched via subscriptionService.getPlans)
 * so this module has no compile-time opinion about which plans exist.
 *
 * The underlying native module holds one stateful connection to the
 * Bazaar app, so every call here connects before and disconnects after —
 * mirroring connections so concurrent calls don't disconnect each other
 * early.
 */
import bazaar, { BazaarNotFoundError, DisconnectedError, ItemNotFoundError } from '@cafebazaar/react-native-poolakey';
import { CAFEBAZAAR_RSA_PUBLIC_KEY } from '@constants/config';

export type BazaarPurchaseResult = Awaited<ReturnType<typeof bazaar.subscribeProduct>>;
export type BazaarSkuDetails = Awaited<ReturnType<typeof bazaar.getSubscriptionSkuDetails>>[number];

export { BazaarNotFoundError, DisconnectedError, ItemNotFoundError };

/** True when a rejected purchase/subscribe promise means "user backed out", not a real failure. */
export function isBazaarPurchaseCanceled(error: unknown): boolean {
  return error instanceof Error && error.message === 'purchase canceled';
}

let openConnections = 0;

async function withBazaarConnection<T>(run: () => Promise<T>): Promise<T> {
  if (openConnections === 0) {
    await bazaar.connect(CAFEBAZAAR_RSA_PUBLIC_KEY);
  }
  openConnections += 1;
  try {
    return await run();
  } finally {
    openConnections -= 1;
    if (openConnections === 0) {
      await bazaar.disconnect().catch(() => {});
    }
  }
}

/** Subscribes the user to a plan via Bazaar's billing UI. Resolves with the purchase to verify server-side. */
export function subscribeToPlan(sku: string): Promise<BazaarPurchaseResult> {
  return withBazaarConnection(() => bazaar.subscribeProduct(sku));
}

/** Real Bazaar-client prices for the given SKUs — use these over any hardcoded price. */
export function getSkuDetails(skus: string[]): Promise<BazaarSkuDetails[]> {
  return withBazaarConnection(() => bazaar.getSubscriptionSkuDetails(skus));
}

/**
 * Subscriptions Bazaar has on record for this device's Bazaar account —
 * used to restore premium after a reinstall, a device change, or a
 * purchase whose verify() call never reached our backend (e.g. the app
 * was killed between the Bazaar purchase sheet closing and the request
 * completing). Resolves to an empty array when there is nothing to
 * restore — Poolakey only rejects this call on a real connection/service
 * failure, not on "no subscriptions found".
 *
 * Each result's purchaseToken is still sent through the same
 * subscriptionService.verifyBazaarPurchase() as a fresh purchase — there
 * is no separate "restore" endpoint or trust path.
 */
export function restoreBazaarPurchases(): Promise<BazaarPurchaseResult[]> {
  return withBazaarConnection(() => bazaar.getSubscribedProducts());
}
