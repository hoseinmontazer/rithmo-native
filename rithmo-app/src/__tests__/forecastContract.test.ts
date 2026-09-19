/**
 * Personalized Symptom Forecast (P0.5) — routing/premium-gating/
 * state-handling contract. Same source-scanning technique as
 * weeklyReviewContract.test.ts/cycleChangeReviewContract.test.ts (this
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

/** One exported function's own body — never the whole file. The naive
 * `/export function useForecast[^]*isPremium/` pattern this file used to
 * use is a false-pass trap: `[^]*` is greedy and happily matches through
 * to a LATER function's `isPremium` (useFertileWindow/useHealthChanges
 * genuinely still have it), so it "passes" even when useForecast itself
 * has no such text at all. */
function fnBody(src: string, name: string): string {
  const re = new RegExp(`export function ${name}\\([^]*?\\n}\\n`);
  return src.match(re)?.[0] ?? '';
}

describe('Forecast endpoint', () => {
  it('is defined and matches the backend route', () => {
    expect(API_ENDPOINTS.INTELLIGENCE_FORECAST).toBe('/api/intelligence/forecast/');
  });

  it('the service calls exactly this endpoint, GET only', () => {
    const src = read('api/services/intelligenceService.ts');
    expect(src).toMatch(/apiClient[^]*\.get\(API_ENDPOINTS\.INTELLIGENCE_FORECAST\)/);
  });
});

describe('Forecast is free, with a per-response Premium gate (docs/DECISIONS.md DEC-005)', () => {
  it('the hook is gated on auth only — no premium check', () => {
    const body = fnBody(read('hooks/queries/useIntelligence.ts'), 'useForecast');
    expect(body).toMatch(/isAuthenticated/);
    expect(body).not.toMatch(/isPremium/);
    expect(body).not.toMatch(/usePremiumStatus/);
  });

  it('is fetched for any authenticated user, not disabled on premium status', () => {
    const body = fnBody(read('hooks/queries/useIntelligence.ts'), 'useForecast');
    expect(body).toMatch(/enabled:[^]*isAuthenticated/);
  });

  it('the card renders a contextual PremiumGate CTA keyed off the backend premium_required/forecast_count, not local premium state', () => {
    const src = read('screens/insights/components/ForecastCard.tsx');
    expect(src).toMatch(/data\.premium_required/);
    expect(src).toMatch(/data\.forecast_count|forecasts\.length === 0/);
    expect(src).toMatch(/<PremiumGate/);
    expect(src).not.toMatch(/usePremiumStatus/);
  });

  it('never shows the Premium teaser for a zero-data/learning-mode user', () => {
    const src = read('screens/insights/components/ForecastCard.tsx');
    // The teaser branch must be reached only via premium_required, and
    // learning_mode must still short-circuit to the coverage message
    // first — the same order the payload itself computes them in.
    expect(src).toMatch(/data\.learning_mode \|\| \(data\.forecasts\.length === 0 && !data\.premium_required\)/);
  });
});

describe('Forecast state handling', () => {
  it('shows a real skeleton while loading, not a bare spinner or nothing', () => {
    const src = read('screens/insights/components/ForecastCard.tsx');
    expect(src).toMatch(/StoryCardSkeleton/);
  });

  it('renders the backend coverage message on insufficient data, never a fabricated one', () => {
    const src = read('screens/insights/components/ForecastCard.tsx');
    expect(src).toMatch(/data\.coverage_message_fa/);
  });

  it('has a distinct error state with retry, separate from the empty/insufficient-data state', () => {
    const src = read('screens/insights/components/ForecastCard.tsx');
    expect(src).toMatch(/isError/);
    expect(src).toMatch(/ErrorState/);
    expect(src).toMatch(/onRetry=\{refetch\}/);
  });

  it('never computes a date or cycle-day range itself — only formats what the backend sent', () => {
    const src = read('screens/insights/components/ForecastCard.tsx');
    // Formatting helpers only (faDateShort/toFa); no arithmetic on dates.
    expect(src).not.toMatch(/new Date\(/);
    expect(src).not.toMatch(/getTime\(\)|setDate\(/);
  });

  it('renders the backend uncertainty note verbatim, never a stronger client-side claim', () => {
    const src = read('screens/insights/components/ForecastCard.tsx');
    expect(src).toMatch(/forecast\.uncertainty_note_fa/);
    expect(src).not.toMatch(/قطعاً|حتماً|مطمئناً/);
  });
});

describe('Forecast reachability and scope', () => {
  it('is rendered from the Premium Dashboard screen', () => {
    const src = read('screens/insights/PremiumDashboardScreen.tsx');
    expect(src).toMatch(/<ForecastCard/);
  });

  it('every hardcoded label is Persian, never English UI text', () => {
    const src = read('screens/insights/components/ForecastCard.tsx');
    expect(src).toMatch(/پیش‌بینی شخصی/);
    expect(src).not.toMatch(/>{?['"]?[A-Za-z]{4,}/);
  });
});
