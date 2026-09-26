/**
 * Monetization & Entitlement Layer — Zibal/Global promo price contract.
 *
 * Source-scanning tests (this project's convention for screen-level
 * behavior — see checkinNotificationContract.test.ts for the same
 * pattern), not rendering tests. Real UI/visual behavior is verified
 * on-device, not here.
 *
 * Covers: UpgradeScreen must never open the Zibal payment WebView for a
 * checkout the backend already activated for free (status: "free") —
 * doing so would show a blank/broken page, since there is no
 * payment_url and no callback URL for ZibalPaymentScreen to watch for.
 */
import * as fs from 'fs';
import * as path from 'path';

export {};

function read(relPath: string): string {
  return fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
}

describe('UpgradeScreen — free Zibal activation never opens the payment WebView', () => {
  const src = read('screens/profile/UpgradeScreen.tsx');

  it('checks status === "free" before doing anything else with the response', () => {
    expect(src).toMatch(/requestZibalPayment\(\{ plan: planId \}\)/);
    expect(src).toMatch(/res\.data\.status === 'free'/);
  });

  it('the free branch never navigates to ZibalPayment', () => {
    const start = src.indexOf("res.data.status === 'free'");
    const freeBlockEnd = src.indexOf('return;', start);
    const freeBlock = src.slice(start, freeBlockEnd);
    expect(freeBlock).not.toMatch(/navigation\.navigate\('ZibalPayment'/);
  });

  it('the free branch refreshes subscription status and confirms success to the user', () => {
    const start = src.indexOf("res.data.status === 'free'");
    const freeBlockEnd = src.indexOf('return;', start);
    const freeBlock = src.slice(start, freeBlockEnd);
    expect(freeBlock).toMatch(/invalidateQueries/);
    expect(freeBlock).toMatch(/Alert\.alert/);
  });

  it('only the non-free path navigates to ZibalPayment, using payment_url', () => {
    const navigateCall = src.slice(
      src.indexOf("res.data.status === 'free'"),
      src.indexOf('}, [navigation, queryClient]);'),
    );
    expect(navigateCall).toMatch(/navigation\.navigate\('ZibalPayment', \{ paymentUrl: res\.data\.payment_url \}\)/);
  });

  it('shows a distinct "رایگان" price and a promo badge when a plan is fully free', () => {
    expect(src).toMatch(/isFree = rial === 0/);
    expect(src).toMatch(/'رایگان'/);
  });

  it('shows the original (pre-promo) price for comparison when a promo is active but not 100%', () => {
    expect(src).toMatch(/originalRial/);
    expect(src).toMatch(/بجای/); // "instead of <original price>"
  });
});

describe('subscriptionService — Zibal response types reflect the free/paid split', () => {
  const src = read('api/services/subscriptionService.ts');

  it('ZibalPlan carries an optional original_amount_rial for a "was / now" display', () => {
    expect(src).toMatch(/original_amount_rial\?:\s*number/);
  });

  it('RequestZibalPaymentResponse is a discriminated union on status, not one loosely-optional shape', () => {
    expect(src).toMatch(/RequestZibalPaymentPaidResponse/);
    expect(src).toMatch(/RequestZibalPaymentFreeResponse/);
    expect(src).toMatch(/status:\s*'free'/);
  });
});
