/**
 * Weekly Review («مرور این هفته») — routing/premium-gating/state-handling
 * contract. Mirrors cycleChangeReviewContract.test.ts exactly.
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

describe('Weekly Review endpoint', () => {
  it('is defined and matches the backend route', () => {
    expect(API_ENDPOINTS.AI_WEEKLY_REVIEW).toBe('/api/ai/weekly-review/');
  });

  it('the service calls exactly this endpoint, GET only', () => {
    const src = read('api/services/aiReflectionService.ts');
    expect(src).toMatch(/apiClient\.get.*API_ENDPOINTS\.AI_WEEKLY_REVIEW/);
  });

  it('mobile never constructs a Qwen/NexusLLM URL directly', () => {
    const src = read('api/services/aiReflectionService.ts');
    expect(src).not.toMatch(/192\.168\.|nexusllm|chat\/completions/i);
  });
});

describe('Weekly Review premium gating', () => {
  it('the hook is gated on the shared premium-status hook, not a bespoke check', () => {
    const src = read('hooks/queries/useWeeklyReview.ts');
    expect(src).toMatch(/usePremiumStatus/);
    expect(src).toMatch(/enabled:.*isPremium/s);
  });

  it('the hook never retries synchronously (AI failure must not block the UI)', () => {
    const src = read('hooks/queries/useWeeklyReview.ts');
    expect(src).toMatch(/retry:\s*false/);
  });

  it('is placed on the Insights screen behind the shared PremiumGate component, alongside CycleChangeCard, not a bespoke lock UI', () => {
    const src = read('screens/insights/InsightsHomeScreen.tsx');
    expect(src).toMatch(/<PremiumGate[^]*<CycleChangeCard[^]*<WeeklyReviewCard/);
  });
});

describe('Weekly Review unavailable/loading state', () => {
  it('the card renders nothing (not an error) when no review is available', () => {
    const src = read('screens/insights/components/WeeklyReviewCard.tsx');
    expect(src).toMatch(/if\s*\(!review\)\s*\{\s*return null/);
  });

  it('the card does not render its own loading spinner or error banner', () => {
    const src = read('screens/insights/components/WeeklyReviewCard.tsx');
    expect(src).not.toMatch(/ActivityIndicator/);
    expect(src).not.toMatch(/ErrorState/);
  });

  it('the hook collapses every failure mode to the same "no review" shape — no separate error state exposed', () => {
    const src = read('hooks/queries/useWeeklyReview.ts');
    expect(src).toMatch(/return\s*\{\s*isLoading/);
    expect(src).not.toMatch(/isError/);
  });
});

describe('Weekly Review reachability, scope and evidence grounding', () => {
  it('is rendered from the existing Insights screen, not a new screen/route', () => {
    const src = read('screens/insights/InsightsHomeScreen.tsx');
    expect(src).toMatch(/<WeeklyReviewCard/);
  });

  it('does not register a new navigator/tab/route', () => {
    const navTypes = read('navigation/types.ts');
    expect(navTypes).not.toMatch(/WeeklyReview/);
    const mainNav = read('navigation/MainNavigator.tsx');
    expect(mainNav).not.toMatch(/WeeklyReview/i);
  });

  it('the disclaimer/limitations are rendered exactly as the backend sent them (no client-side rewriting)', () => {
    const src = read('screens/insights/components/WeeklyReviewCard.tsx');
    expect(src).toMatch(/review\.limitations\.map/);
    expect(src).not.toMatch(/توصیه پزشکی نیست|جایگزین مشاوره/);
  });

  it('every hardcoded label is Persian, never English UI text', () => {
    const src = read('screens/insights/components/WeeklyReviewCard.tsx');
    expect(src).toMatch(/مرور این هفته/);
    expect(src).not.toMatch(/>{?['"]?[A-Za-z]{4,}/);
  });

  it('the evidence note passed to the card is built from an already-fetched count on the same screen, never a new fetch', () => {
    const src = read('screens/insights/InsightsHomeScreen.tsx');
    // Must derive from loggedDayCount/observedCycles (progress query
    // already used above on this screen) — not a separate hook/service.
    expect(src).toMatch(/aiEvidenceNote\s*=[^;]*loggedDayCount[^;]*observedCycles/s);
    expect(src).toMatch(/evidenceNote=\{aiEvidenceNote\}/);
  });
});

describe('Premium upsell copy sells the outcome, not the technology', () => {
  it('PremiumGate default copy never says "powered by AI" or similar', () => {
    const src = read('components/PremiumGate.tsx');
    expect(src).not.toMatch(/هوش مصنوعی/);
    expect(src).not.toMatch(/AI/);
  });
});
