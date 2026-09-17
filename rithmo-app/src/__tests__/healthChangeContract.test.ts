/**
 * Health Change Detection + Pain/PMS Intelligence (P1.2) — routing/
 * premium-gating/state-handling contract. Same source-scanning technique
 * as fertileWindowContract.test.ts (this project verifies component
 * rendering on-device, not in Jest — see jest.config.js's own docstring).
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

describe('Health change endpoint', () => {
  it('is defined and matches the backend route', () => {
    expect(API_ENDPOINTS.INTELLIGENCE_HEALTH_CHANGES).toBe('/api/intelligence/health-changes/');
  });

  it('the service calls exactly this endpoint, GET only', () => {
    const src = read('api/services/intelligenceService.ts');
    expect(src).toMatch(/apiClient[^]*\.get\(API_ENDPOINTS\.INTELLIGENCE_HEALTH_CHANGES\)/);
  });
});

describe('Health change premium gating', () => {
  it('the hook is gated on the shared premium-status hook, not a bespoke check', () => {
    const src = read('hooks/queries/useIntelligence.ts');
    expect(src).toMatch(/export function useHealthChanges[^]*usePremiumStatus/);
  });

  it('is not fetched at all for a non-premium/unauthenticated user (enabled gate, not a client-side hide)', () => {
    const src = read('hooks/queries/useIntelligence.ts');
    expect(src).toMatch(/export function useHealthChanges[^]*enabled:[^]*isPremium/);
  });
});

describe('Health change state handling', () => {
  it('shows a real skeleton while loading, not a bare spinner or nothing', () => {
    const src = read('screens/insights/components/HealthChangeCard.tsx');
    expect(src).toMatch(/StoryCardSkeleton/);
  });

  it('renders the backend coverage message when learning or nothing qualifies, never a fabricated one', () => {
    const src = read('screens/insights/components/HealthChangeCard.tsx');
    expect(src).toMatch(/data\.coverage_message_fa/);
    expect(src).toMatch(/learning_mode \|\| data\.health_changes\.length === 0/);
  });

  it('has a distinct error state with retry, separate from the empty/coverage state', () => {
    const src = read('screens/insights/components/HealthChangeCard.tsx');
    expect(src).toMatch(/isError/);
    expect(src).toMatch(/ErrorState/);
    expect(src).toMatch(/onRetry=\{refetch\}/);
  });

  it('never computes a baseline, deviation, or confidence itself — only renders what the backend sent', () => {
    const src = read('screens/insights/components/HealthChangeCard.tsx');
    expect(src).not.toMatch(/new Date\(/);
    expect(src).not.toMatch(/getTime\(\)|setDate\(/);
    expect(src).not.toMatch(/stdev|pstdev|median\(/i);
  });

  it('renders each insight verbatim (title_fa/body_fa), never rewriting the backend copy', () => {
    const src = read('screens/insights/components/HealthChangeCard.tsx');
    expect(src).toMatch(/insight\.title_fa/);
    expect(src).toMatch(/insight\.body_fa/);
  });

  it('renders the backend disclaimer verbatim', () => {
    const src = read('screens/insights/components/HealthChangeCard.tsx');
    expect(src).toMatch(/data\.disclaimer_fa/);
  });

  it('never states a diagnosis, a population comparison, or a percentage', () => {
    const src = read('screens/insights/components/HealthChangeCard.tsx');
    expect(src).not.toMatch(/%/);
    expect(src).not.toMatch(/تشخیص|قطعاً|حتماً|معمولاً زنان|بیماری/);
  });
});

describe('Health change reachability and scope', () => {
  it('is rendered from the Premium Dashboard screen', () => {
    const src = read('screens/insights/PremiumDashboardScreen.tsx');
    expect(src).toMatch(/<HealthChangeCard/);
  });

  it('every hardcoded label is Persian, never English UI text', () => {
    const src = read('screens/insights/components/HealthChangeCard.tsx');
    expect(src).toMatch(/تغییرات سلامتی/);
    expect(src).not.toMatch(/>{?['"]?[A-Za-z]{4,}/);
  });

  it('does not introduce a new insight/generic model — reuses the existing Insight type', () => {
    const src = read('screens/insights/components/HealthChangeCard.tsx');
    expect(src).toMatch(/from '@types\/intelligence\.types'/);
  });
});
