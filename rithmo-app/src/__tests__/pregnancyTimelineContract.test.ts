/**
 * Pregnancy Intelligence Mode + Timeline (P1.3) — routing/premium-gating/
 * state-handling contract. Same source-scanning technique as
 * healthChangeContract.test.ts/fertileWindowContract.test.ts (this
 * project verifies component rendering on-device, not in Jest — see
 * jest.config.js's own docstring).
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

describe('Pregnancy timeline endpoint', () => {
  it('is defined and matches the backend route', () => {
    expect(API_ENDPOINTS.INTELLIGENCE_PREGNANCY).toBe('/api/intelligence/pregnancy/');
  });

  it('the pregnancy service calls exactly this endpoint, GET only', () => {
    const src = read('api/services/pregnancyService.ts');
    expect(src).toMatch(/getTimeline[^]*apiClient\.get(?:<[^>]*>)?\(API_ENDPOINTS\.INTELLIGENCE_PREGNANCY\)/);
  });

  it('does not add a new call site for the existing /api/pregnancy/ endpoints', () => {
    const src = read('api/services/pregnancyService.ts');
    // Regression guard: PREGNANCY (getStatus GET + start POST, pre-existing)
    // and PREGNANCY_END (end POST, pre-existing) must still resolve exactly
    // as many times as before P1.3 — never a new use of either.
    expect(src.match(/API_ENDPOINTS\.PREGNANCY\b/g)?.length).toBe(2);
    expect(src.match(/API_ENDPOINTS\.PREGNANCY_END/g)?.length).toBe(1);
  });
});

describe('Pregnancy timeline is free (docs/DECISIONS.md DEC-005)', () => {
  it('the hook is gated on auth only, not premium status', () => {
    const src = read('hooks/queries/usePregnancy.ts');
    expect(src).toMatch(/export function usePregnancyTimeline[^]*enabled:[^]*isAuthenticated/);
  });

  it('is fetched for any authenticated user — regression guard for the bug this fix closed', () => {
    const src = read('hooks/queries/usePregnancy.ts');
    // This hook used to also require isPremium, which would have kept a
    // free user's timeline query disabled forever even after the
    // screen-level paywall was removed.
    const fnBody = src.match(/export function usePregnancyTimeline[\s\S]*?\n}/)?.[0] ?? '';
    expect(fnBody).not.toMatch(/isPremium/);
  });
});

describe('Pregnancy timeline state handling', () => {
  it('shows a real loading state while loading, not a bare spinner or nothing', () => {
    const src = read('screens/pregnancy/PregnancyStatusScreen.tsx');
    expect(src).toMatch(/timelineLoading[^]*LoadingState/);
  });

  it('has a distinct error state with retry, separate from loading/empty', () => {
    const src = read('screens/pregnancy/PregnancyStatusScreen.tsx');
    expect(src).toMatch(/timelineIsError/);
    expect(src).toMatch(/<ErrorState/);
    expect(src).toMatch(/onRetry=\{refetchTimeline\}/);
  });

  it('never shows an empty timeline card when there is nothing to render', () => {
    const src = read('screens/pregnancy/PregnancyStatusScreen.tsx');
    expect(src).toMatch(/timeline\.timeline\.length > 0/);
  });

  it('renders the backend disclaimer verbatim', () => {
    const src = read('screens/pregnancy/PregnancyStatusScreen.tsx');
    expect(src).toMatch(/timeline\?\.disclaimer_fa/);
  });

  it('the timeline component never computes a date, week, or trimester itself — only renders what the backend sent', () => {
    const src = read('screens/pregnancy/components/PregnancyTimeline.tsx');
    expect(src).not.toMatch(/new Date\(\)/);
    expect(src).not.toMatch(/getTime\(\)\s*-\s*.*getTime\(\)/);
    expect(src).not.toMatch(/setDate\(|getDay\(\)/);
  });

  it('renders each milestone label and state exactly as received', () => {
    const src = read('screens/pregnancy/components/PregnancyTimeline.tsx');
    expect(src).toMatch(/milestone\.label_fa/);
    expect(src).toMatch(/milestone\.state/);
  });

  it('a milestone with no date field never fabricates one', () => {
    const src = read('screens/pregnancy/components/PregnancyTimeline.tsx');
    expect(src).toMatch(/milestone\.date \?/);
  });
});

describe('Pregnancy timeline reachability and scope', () => {
  it('is rendered from the existing PregnancyStatusScreen, not a new screen', () => {
    const src = read('screens/pregnancy/PregnancyStatusScreen.tsx');
    expect(src).toMatch(/<PregnancyTimeline/);
  });

  it('does not introduce a new pregnancy route', () => {
    const src = read('navigation/stacks/ProfileStack.tsx');
    // Exactly the one pre-existing "Pregnancy" screen registration —
    // P1.3 must not add a second route.
    expect(src.match(/name="Pregnancy"/g)?.length).toBe(1);
  });

  it('every hardcoded label in the timeline component is Persian, never English UI text', () => {
    const src = read('screens/pregnancy/components/PregnancyTimeline.tsx');
    expect(src).not.toMatch(/>{?['"]?[A-Za-z]{4,}/);
  });

  it('does not add a chart-library dependency', () => {
    const src = read('screens/pregnancy/components/PregnancyTimeline.tsx');
    expect(src).not.toMatch(/from ['"](react-native-svg|victory-native|react-native-chart-kit|d3)['"]/i);
  });
});
