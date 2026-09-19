/**
 * Ask Rithmo (P0.7) — routing/premium-gating/state-handling contract.
 * Same source-scanning technique as forecastContract.test.ts/
 * monthlyReviewContract.test.ts (this project verifies component
 * rendering on-device, not in Jest).
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

describe('Ask Rithmo endpoint', () => {
  it('is defined and matches the backend route', () => {
    expect(API_ENDPOINTS.AI_ASK_RITHMO).toBe('/api/ai/ask-rithmo/');
  });

  it('the service POSTs the question to exactly this endpoint', () => {
    const src = read('api/services/askRithmoService.ts');
    expect(src).toMatch(/apiClient[^]*\.post[^]*API_ENDPOINTS\.AI_ASK_RITHMO/);
    expect(src).toMatch(/\{\s*question\s*\}/);
  });

  it('mobile never constructs a Qwen/NexusLLM URL directly', () => {
    const src = read('api/services/askRithmoService.ts');
    expect(src).not.toMatch(/192\.168\.|nexusllm|chat\/completions/i);
  });
});

describe('Ask Rithmo registration and reachability', () => {
  it('is registered on the Insights stack, and nowhere else', () => {
    const stacks = ['navigation/stacks/CycleStack.tsx', 'navigation/stacks/HomeStack.tsx',
      'navigation/stacks/InsightsStack.tsx', 'navigation/stacks/MessagesStack.tsx',
      'navigation/stacks/ProfileStack.tsx', 'navigation/stacks/WellnessStack.tsx'];
    const re = /name="AskRithmo"/;
    const owners = stacks.filter((f) => re.test(read(f)));
    expect(owners).toEqual(['navigation/stacks/InsightsStack.tsx']);
  });

  it('does not register a new tab', () => {
    const mainNav = read('navigation/MainNavigator.tsx');
    expect(mainNav).not.toMatch(/AskRithmo/);
  });

  it('has a real incoming navigation call from PremiumDashboardScreen', () => {
    const src = read('screens/insights/PremiumDashboardScreen.tsx');
    expect(src).toMatch(/navigate\('AskRithmo'\)/);
  });

  it('the screen it points to actually exists', () => {
    expect(fs.existsSync(path.join(SRC, 'screens/insights/AskRithmoScreen.tsx'))).toBe(true);
  });

  it('has a Persian navigation title', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { navTitles } = require('@i18n/strings.fa');
    expect(navTitles.AskRithmo).toBeTruthy();
    expect(navTitles.AskRithmo).not.toMatch(/[A-Za-z]/);
  });
});

describe('Ask Rithmo is free, with a per-answer Premium gate (docs/DECISIONS.md DEC-005)', () => {
  it('the mutation hook only requires authentication, never a premium check', () => {
    const src = read('hooks/queries/useAskRithmo.ts');
    expect(src).toMatch(/useAuth/);
    expect(src).not.toMatch(/usePremiumStatus/);
    expect(src).not.toMatch(/isPremium/);
  });

  it('the hook only refuses the unauthenticated case, not a non-premium one', () => {
    const src = read('hooks/queries/useAskRithmo.ts');
    expect(src).toMatch(/!isAuthenticated/);
    expect(src).not.toMatch(/!isAuthenticated \|\| !isPremium/);
  });

  it('the screen does not whole-screen-gate on premium status', () => {
    const src = read('screens/insights/AskRithmoScreen.tsx');
    expect(src).not.toMatch(/usePremiumStatus/);
    expect(src).not.toMatch(/premiumLoading/);
  });

  it('the screen renders a contextual PremiumGate CTA keyed off the backend-provided premium_required flag, not local premium state', () => {
    const src = read('screens/insights/AskRithmoScreen.tsx');
    expect(src).toMatch(/answer\.premium_required/);
    expect(src).toMatch(/<PremiumGate/);
  });
});

describe('Ask Rithmo state handling', () => {
  it('shows a loading state while a question is in flight', () => {
    const src = read('screens/insights/AskRithmoScreen.tsx');
    expect(src).toMatch(/isLoading/);
  });

  it('has a distinct error state (network/HTTP failure) separate from an "unavailable answer" state', () => {
    const src = read('screens/insights/AskRithmoScreen.tsx');
    expect(src).toMatch(/isError/);
    expect(src).toMatch(/ErrorState/);
    expect(src).toMatch(/unavailable/);
  });

  it('an unsupported/insufficient-data answer renders in the same answer card as a real one, never as an error', () => {
    const src = read('screens/insights/AskRithmoScreen.tsx');
    // response.available === true is the ONLY gate for the answer card —
    // "unsupported"/"insufficient" never routes through isError/unavailable.
    expect(src).toMatch(/response\?\.available \? response : null/);
  });

  it('renders every backend-provided answer field verbatim, never restating it more strongly', () => {
    const src = read('screens/insights/AskRithmoScreen.tsx');
    expect(src).toMatch(/answer\.answer_fa/);
    expect(src).toMatch(/answer\.observations_fa/);
    expect(src).toMatch(/answer\.suggestion_fa/);
    expect(src).toMatch(/answer\.disclaimer_fa/);
  });

  it('never hardcodes a stronger-than-backend certainty word', () => {
    const src = read('screens/insights/AskRithmoScreen.tsx');
    expect(src).not.toMatch(/قطعاً|حتماً|مطمئناً/);
  });
});

describe('Ask Rithmo suggested prompts', () => {
  it('chips populate the input rather than triggering a hardcoded canned answer', () => {
    const src = read('screens/insights/AskRithmoScreen.tsx');
    expect(src).toMatch(/SUGGESTED_PROMPTS/);
    expect(src).toMatch(/handleChip/);
    // The chip handler must feed the real ask pipeline (submit/ask), not
    // a local canned-response map.
    expect(src).not.toMatch(/CANNED_ANSWERS|MOCK_ANSWERS/);
  });

  it('every suggested prompt is Persian', () => {
    const src = read('screens/insights/AskRithmoScreen.tsx');
    const match = src.match(/SUGGESTED_PROMPTS = \[([^\]]+)\]/s);
    expect(match).not.toBeNull();
    expect(match![1]).not.toMatch(/[A-Za-z]{3,}/);
  });
});

describe('Ask Rithmo is not a generic chatbot', () => {
  it('does not persist a message/conversation history', () => {
    const src = read('screens/insights/AskRithmoScreen.tsx');
    expect(src).not.toMatch(/MessageBubble|FlatList.*messages|conversation/i);
  });

  it('the hook is a single-shot mutation, not a cached/paginated query', () => {
    const src = read('hooks/queries/useAskRithmo.ts');
    expect(src).toMatch(/useMutation/);
    expect(src).not.toMatch(/useInfiniteQuery/);
  });

  it('every hardcoded label is Persian, never English UI text', () => {
    const src = read('screens/insights/AskRithmoScreen.tsx');
    expect(src).toMatch(/از داده‌های من بپرس/);
    expect(src).not.toMatch(/>{?['"]?[A-Za-z]{4,}/);
  });
});
