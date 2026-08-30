/**
 * Cycle Change Review («این چرخه چه فرقی داشت؟») — routing/premium-gating/
 * state-handling contract. Mirrors aiReflectionContract.test.ts exactly —
 * same rationale (this project does not render components in Jest), same
 * source-scanning-contract technique.
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

describe('Cycle Change Review endpoint', () => {
  it('is defined and matches the backend route', () => {
    expect(API_ENDPOINTS.AI_CYCLE_CHANGE_REVIEW).toBe('/api/ai/cycle-change-review/');
  });

  it('the service calls exactly this endpoint, GET only', () => {
    const src = read('api/services/aiReflectionService.ts');
    expect(src).toMatch(/apiClient\.get.*API_ENDPOINTS\.AI_CYCLE_CHANGE_REVIEW/);
  });

  it('mobile never constructs a Qwen/NexusLLM URL directly', () => {
    const src = read('api/services/aiReflectionService.ts');
    expect(src).not.toMatch(/192\.168\.|nexusllm|chat\/completions/i);
  });
});

describe('Cycle Change Review premium gating', () => {
  it('the hook is gated on the shared premium-status hook, not a bespoke check', () => {
    const src = read('hooks/queries/useCycleChangeReview.ts');
    expect(src).toMatch(/usePremiumStatus/);
    expect(src).toMatch(/enabled:.*isPremium/s);
  });

  it('the hook never retries synchronously (AI failure must not block the UI)', () => {
    const src = read('hooks/queries/useCycleChangeReview.ts');
    expect(src).toMatch(/retry:\s*false/);
  });

  it('is placed on the Insights screen behind the shared PremiumGate component, not a bespoke lock UI', () => {
    const src = read('screens/insights/InsightsHomeScreen.tsx');
    expect(src).toMatch(/<PremiumGate[^]*<CycleChangeCard/);
  });
});

describe('Cycle Change Review unavailable/loading state', () => {
  it('the card renders nothing (not an error) when no review is available', () => {
    const src = read('screens/insights/components/CycleChangeCard.tsx');
    expect(src).toMatch(/if\s*\(!review\)\s*\{\s*return null/);
  });

  it('the card does not render its own loading spinner or error banner', () => {
    const src = read('screens/insights/components/CycleChangeCard.tsx');
    expect(src).not.toMatch(/ActivityIndicator/);
    expect(src).not.toMatch(/ErrorState/);
  });

  it('the hook collapses every failure mode to the same "no review" shape — no separate error state exposed', () => {
    const src = read('hooks/queries/useCycleChangeReview.ts');
    expect(src).toMatch(/return\s*\{\s*isLoading/);
    expect(src).not.toMatch(/isError/);
  });
});

describe('Cycle Change Review reachability and scope', () => {
  it('is rendered from the existing Insights screen, not a new screen/route', () => {
    const src = read('screens/insights/InsightsHomeScreen.tsx');
    expect(src).toMatch(/<CycleChangeCard/);
  });

  it('does not register a new navigator/tab/route', () => {
    const navTypes = read('navigation/types.ts');
    expect(navTypes).not.toMatch(/CycleChange/);
    const mainNav = read('navigation/MainNavigator.tsx');
    expect(mainNav).not.toMatch(/CycleChange/i);
  });

  it('the disclaimer/limitations are rendered exactly as the backend sent them (no client-side rewriting)', () => {
    const src = read('screens/insights/components/CycleChangeCard.tsx');
    expect(src).toMatch(/review\.limitations\.map/);
    expect(src).not.toMatch(/توصیه پزشکی نیست|جایگزین مشاوره/);
  });

  it('every string rendered is either backend data or Persian UI copy, never a hardcoded English label', () => {
    const src = read('screens/insights/components/CycleChangeCard.tsx');
    expect(src).toMatch(/این چرخه چه فرقی داشت؟/);
    expect(src).not.toMatch(/>{?['"]?[A-Za-z]{4,}/);
  });
});
