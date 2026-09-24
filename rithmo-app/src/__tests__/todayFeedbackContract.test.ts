/**
 * Today AI Feedback (Today 2.0, Layer B) — routing/hook/UI-wiring
 * contract. Same source-scanning technique as askRithmoContract.test.ts.
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

describe('Today Feedback endpoint', () => {
  it('is defined, distinct from the unrelated legacy AI_FEEDBACK constant', () => {
    expect(API_ENDPOINTS.AI_TODAY_FEEDBACK).toBe('/api/ai/today-feedback/');
    expect(API_ENDPOINTS.AI_TODAY_FEEDBACK).not.toBe(API_ENDPOINTS.AI_FEEDBACK);
  });

  it('the service POSTs with no date parameter (always the server\'s own today)', () => {
    const src = read('api/services/todayFeedbackService.ts');
    expect(src).toMatch(/apiClient[^]*\.post<TodayFeedbackResponse>\(API_ENDPOINTS\.AI_TODAY_FEEDBACK\)/);
  });
});

describe('useTodayFeedback', () => {
  const src = read('hooks/queries/useTodayFeedback.ts');

  it('is a mutation (explicit trigger), not an auto-fetched query', () => {
    expect(src).toMatch(/useMutation</);
    expect(src).not.toMatch(/useQuery</);
  });

  it('is free for every authenticated user — no premium gate on the request itself', () => {
    expect(src).not.toMatch(/usePremiumStatus/);
    expect(src).toMatch(/isAuthenticated/);
  });

  it('surfaces quota from both a successful response and a 429 refusal', () => {
    expect(src).toMatch(/mutation\.data\?\.quota/);
    expect(src).toMatch(/response\?\.data\?\.quota/);
    expect(src).toMatch(/response\?\.status === 429/);
  });
});

describe('Today Feedback UI', () => {
  it('QuickLogScreen shows the feedback summary/observations/suggestion/limitations and remaining quota', () => {
    const src = read('screens/wellness/QuickLogScreen.tsx');
    expect(src).toMatch(/feedback\.summary/);
    expect(src).toMatch(/feedback\.observations\.map/);
    expect(src).toMatch(/feedback\.suggestion/);
    expect(src).toMatch(/feedback\.limitations\.map/);
    expect(src).toMatch(/feedbackQuota\?\.remaining/);
  });

  it('a quota-exhausted state renders the premium upsell, not a bare error', () => {
    const src = read('screens/wellness/QuickLogScreen.tsx');
    expect(src).toMatch(/isQuotaExhausted[^]*PremiumGate/);
  });
});
