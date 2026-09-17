/**
 * Fertile Window Intelligence (P1.1) — routing/premium-gating/
 * state-handling contract. Same source-scanning technique as
 * forecastContract.test.ts (this project verifies component rendering
 * on-device, not in Jest — see jest.config.js's own docstring).
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

describe('Fertile window endpoint', () => {
  it('is defined and matches the backend route', () => {
    expect(API_ENDPOINTS.INTELLIGENCE_FERTILE_WINDOW).toBe('/api/intelligence/fertile-window/');
  });

  it('the service calls exactly this endpoint, GET only', () => {
    const src = read('api/services/intelligenceService.ts');
    expect(src).toMatch(/apiClient[^]*\.get\(API_ENDPOINTS\.INTELLIGENCE_FERTILE_WINDOW\)/);
  });
});

describe('Fertile window premium gating', () => {
  it('the hook is gated on the shared premium-status hook, not a bespoke check', () => {
    const src = read('hooks/queries/useIntelligence.ts');
    expect(src).toMatch(/export function useFertileWindow[^]*usePremiumStatus/);
  });

  it('is not fetched at all for a non-premium/unauthenticated user (enabled gate, not a client-side hide)', () => {
    const src = read('hooks/queries/useIntelligence.ts');
    expect(src).toMatch(/export function useFertileWindow[^]*enabled:[^]*isPremium/);
  });
});

describe('Fertile window state handling', () => {
  it('shows a real skeleton while loading, not a bare spinner or nothing', () => {
    const src = read('screens/insights/components/FertileWindowCard.tsx');
    expect(src).toMatch(/StoryCardSkeleton/);
  });

  it('renders the backend reliability/coverage note on insufficient data, never a fabricated one', () => {
    const src = read('screens/insights/components/FertileWindowCard.tsx');
    expect(src).toMatch(/data\.reliability_note_fa/);
    expect(src).toMatch(/basis === 'insufficient_data'/);
  });

  it('has a distinct error state with retry, separate from the empty/insufficient-data state', () => {
    const src = read('screens/insights/components/FertileWindowCard.tsx');
    expect(src).toMatch(/isError/);
    expect(src).toMatch(/ErrorState/);
    expect(src).toMatch(/onRetry=\{refetch\}/);
  });

  it('never computes a date itself — only formats what the backend sent', () => {
    const src = read('screens/insights/components/FertileWindowCard.tsx');
    expect(src).not.toMatch(/new Date\(/);
    expect(src).not.toMatch(/getTime\(\)|setDate\(/);
  });

  it('renders the backend disclaimer verbatim', () => {
    const src = read('screens/insights/components/FertileWindowCard.tsx');
    expect(src).toMatch(/data\.disclaimer_fa/);
  });

  it('never states a conception probability or a fertility guarantee', () => {
    const src = read('screens/insights/components/FertileWindowCard.tsx');
    expect(src).not.toMatch(/%/);
    expect(src).not.toMatch(/قطعاً|حتماً|تضمین|تخمک‌گذاری قطعی/);
  });
});

describe('Fertile window reachability and scope', () => {
  it('is rendered from the Premium Dashboard screen', () => {
    const src = read('screens/insights/PremiumDashboardScreen.tsx');
    expect(src).toMatch(/<FertileWindowCard/);
  });

  it('every hardcoded label is Persian, never English UI text', () => {
    const src = read('screens/insights/components/FertileWindowCard.tsx');
    expect(src).toMatch(/بازه‌ی باروری/);
    expect(src).not.toMatch(/>{?['"]?[A-Za-z]{4,}/);
  });
});
