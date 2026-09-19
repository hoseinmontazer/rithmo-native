/**
 * Monthly Review (P0.6) — routing/premium-gating/state-handling contract
 * for both the deterministic facts (useMonthlyReview) and the AI
 * synthesis built on top of them (useMonthlyReviewNarrative). Same
 * source-scanning technique as weeklyReviewContract.test.ts (this project
 * verifies component rendering on-device, not in Jest).
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

import { API_ENDPOINTS } from '@constants/config';

const SRC = path.join(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

/** One exported function's own body — never the whole file. A naive
 * `/export function useMonthlyReview[^]*isPremium/` pattern is a
 * false-pass trap: `[^]*` is greedy and matches through to a LATER
 * function's `isPremium` (useFertileWindow/useHealthChanges genuinely
 * still have it) even when useMonthlyReview itself has no such text. */
function fnBody(src: string, name: string): string {
  const re = new RegExp(`export function ${name}\\([^]*?\\n}\\n`);
  return src.match(re)?.[0] ?? '';
}

describe('Monthly Review endpoints', () => {
  it('the deterministic endpoint is defined and matches the backend route', () => {
    expect(API_ENDPOINTS.INTELLIGENCE_REVIEW_MONTHLY).toBe('/api/intelligence/review/monthly/');
  });

  it('the AI narrative endpoint is defined and matches the backend route', () => {
    expect(API_ENDPOINTS.AI_MONTHLY_REVIEW).toBe('/api/ai/monthly-review/');
  });

  it('the deterministic service calls exactly its endpoint, GET only', () => {
    const src = read('api/services/intelligenceService.ts');
    expect(src).toMatch(/apiClient[^]*\.get\(API_ENDPOINTS\.INTELLIGENCE_REVIEW_MONTHLY\)/);
  });

  it('the AI narrative service calls exactly its endpoint, GET only', () => {
    const src = read('api/services/aiReflectionService.ts');
    expect(src).toMatch(/apiClient\.get.*API_ENDPOINTS\.AI_MONTHLY_REVIEW/);
  });

  it('these are two distinct endpoints — the facts are not silently dropped if the narrative fails', () => {
    expect(API_ENDPOINTS.INTELLIGENCE_REVIEW_MONTHLY).not.toBe(API_ENDPOINTS.AI_MONTHLY_REVIEW);
  });
});

describe('Monthly Review facts are free; the AI narrative stays Premium (docs/DECISIONS.md DEC-005)', () => {
  it('the deterministic hook is gated on auth only, not premium status', () => {
    const body = fnBody(read('hooks/queries/useIntelligence.ts'), 'useMonthlyReview');
    expect(body).not.toMatch(/usePremiumStatus/);
    expect(body).not.toMatch(/isPremium/);
    expect(body).toMatch(/enabled:[^]*isAuthenticated/);
  });

  it('the card renders a contextual PremiumGate CTA for the cross-cycle depth, keyed off the backend flag', () => {
    const src = read('screens/insights/components/MonthlyReviewCard.tsx');
    expect(src).toMatch(/data\.premium_required/);
    expect(src).toMatch(/data\.premium_teaser_fa/);
    expect(src).toMatch(/<PremiumGate/);
  });

  it('the AI narrative hook is still gated on the shared premium-status hook, and never retries synchronously', () => {
    const src = read('hooks/queries/useMonthlyReviewNarrative.ts');
    expect(src).toMatch(/usePremiumStatus/);
    expect(src).toMatch(/enabled:.*isPremium/s);
    expect(src).toMatch(/retry:\s*false/);
  });
});

describe('Monthly Review state handling', () => {
  it('shows a real skeleton while loading', () => {
    const src = read('screens/insights/components/MonthlyReviewCard.tsx');
    expect(src).toMatch(/StoryCardSkeleton/);
  });

  it('renders the backend coverage message when no cycle has completed yet, never a fabricated one', () => {
    const src = read('screens/insights/components/MonthlyReviewCard.tsx');
    expect(src).toMatch(/data\.coverage_message_fa/);
    expect(src).toMatch(/!data\.cycle/);
  });

  it('has a distinct error state with retry', () => {
    const src = read('screens/insights/components/MonthlyReviewCard.tsx');
    expect(src).toMatch(/isError/);
    expect(src).toMatch(/ErrorState/);
    expect(src).toMatch(/onRetry=\{refetch\}/);
  });

  it('the AI synthesis is strictly secondary — the facts render even when it is unavailable', () => {
    const src = read('screens/insights/components/MonthlyReviewCard.tsx');
    // The narrative section is conditional; the fact rows (FactRow) are not.
    expect(src).toMatch(/\{narrative\s*&&/);
    expect(src).not.toMatch(/if\s*\(!narrative\)\s*\{\s*return null/);
  });

  it('patterns shown are only REPEATED/ESTABLISHED, reusing the existing Insight/confidence type — not a re-derived tier', () => {
    const src = read('screens/insights/components/MonthlyReviewCard.tsx');
    expect(src).toMatch(/confidence_label_fa/);
    expect(src).not.toMatch(/classifyConfidence|computeConfidence/);
  });
});

describe('Monthly Review reachability and scope', () => {
  it('is rendered from the Premium Dashboard screen', () => {
    const src = read('screens/insights/PremiumDashboardScreen.tsx');
    expect(src).toMatch(/<MonthlyReviewCard/);
  });

  it('reuses the SymptomForecast type for next-cycle expectations, not a duplicated shape', () => {
    const src = read('types/monthlyReview.types.ts');
    expect(src).toMatch(/import type \{ SymptomForecast \} from '\.\/forecast\.types'/);
  });

  it('every hardcoded label is Persian, never English UI text', () => {
    const src = read('screens/insights/components/MonthlyReviewCard.tsx');
    expect(src).toMatch(/مرور ماهانه/);
    expect(src).not.toMatch(/>{?['"]?[A-Za-z]{4,}/);
  });
});
