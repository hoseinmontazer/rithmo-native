/**
 * Cafe Bazaar restore-purchase — pure decision logic.
 *
 * These test the reduction from per-purchase verify outcomes to one UI
 * result, and the Bazaar-SKU → plan reverse lookup. The Poolakey SDK call
 * itself (bazaarBilling.restoreBazaarPurchases) is a two-line wrapper
 * around a native module and can only be meaningfully exercised on a
 * device with Bazaar installed — see the mobile verification report for
 * that boundary. What's covered here is everything downstream of it: the
 * exact same logic a device test would otherwise have to re-derive by
 * hand for every one of the eight states in the restore spec.
 */
import {
  planForBazaarSku,
  summarizeBazaarRestore,
  bazaarRestoreMessage,
  type BazaarVerifyOutcome,
} from '@utils/bazaarRestore';

const LATIN = /[A-Za-z]/;

const TEST_PLANS = [
  { plan: 'monthly',   sku: 'rithmo_premium_monthly' },
  { plan: 'quarterly', sku: 'rithmo_premium_3month' },
];

describe('planForBazaarSku', () => {
  it('maps a known SKU back to its plan, against whatever catalog is passed in', () => {
    expect(planForBazaarSku(TEST_PLANS, 'rithmo_premium_monthly')).toBe('monthly');
    expect(planForBazaarSku(TEST_PLANS, 'rithmo_premium_3month')).toBe('quarterly');
  });

  it('returns null for a SKU that is not in the given catalog', () => {
    expect(planForBazaarSku(TEST_PLANS, 'some_other_apps_sku')).toBeNull();
  });

  it('picks up a plan an admin added without any code change — same function, a longer catalog', () => {
    const withNewPlan = [...TEST_PLANS, { plan: 'half_year', sku: 'rithmo_premium_half_year' }];
    expect(planForBazaarSku(withNewPlan, 'rithmo_premium_half_year')).toBe('half_year');
  });
});

describe('summarizeBazaarRestore', () => {
  it('reports no_purchases when Bazaar has nothing on record', () => {
    expect(summarizeBazaarRestore([])).toEqual({ kind: 'no_purchases' });
  });

  it('reports restored when at least one purchase verifies', () => {
    const outcomes: BazaarVerifyOutcome[] = [{ ok: false, status: 402 }, { ok: true }];
    expect(summarizeBazaarRestore(outcomes)).toEqual({ kind: 'restored' });
  });

  it('reports owned_by_other when the backend rejects with 409', () => {
    const outcomes: BazaarVerifyOutcome[] = [{ ok: false, status: 409 }];
    expect(summarizeBazaarRestore(outcomes)).toEqual({ kind: 'owned_by_other' });
  });

  it('reports expired when the backend rejects with 402', () => {
    const outcomes: BazaarVerifyOutcome[] = [{ ok: false, status: 402 }];
    expect(summarizeBazaarRestore(outcomes)).toEqual({ kind: 'expired' });
  });

  it('prioritizes owned_by_other over expired when both are present', () => {
    const outcomes: BazaarVerifyOutcome[] = [{ ok: false, status: 402 }, { ok: false, status: 409 }];
    expect(summarizeBazaarRestore(outcomes)).toEqual({ kind: 'owned_by_other' });
  });

  it('reports network_error on a dropped connection', () => {
    const outcomes: BazaarVerifyOutcome[] = [{ ok: false, networkError: true }];
    expect(summarizeBazaarRestore(outcomes)).toEqual({ kind: 'network_error' });
  });

  it('reports network_error on a 5xx from the backend', () => {
    const outcomes: BazaarVerifyOutcome[] = [{ ok: false, status: 502 }];
    expect(summarizeBazaarRestore(outcomes)).toEqual({ kind: 'network_error' });
  });

  it('falls back to unknown_error for an unrecognized failure', () => {
    const outcomes: BazaarVerifyOutcome[] = [{ ok: false, status: 400 }];
    expect(summarizeBazaarRestore(outcomes)).toEqual({ kind: 'unknown_error' });
  });
});

describe('bazaarRestoreMessage', () => {
  it('is Persian for every outcome kind (never a raw English fallback)', () => {
    const kinds = ['no_purchases', 'restored', 'expired', 'owned_by_other', 'network_error', 'unknown_error'] as const;
    for (const kind of kinds) {
      const message = bazaarRestoreMessage({ kind });
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toMatch(LATIN);
    }
  });
});
