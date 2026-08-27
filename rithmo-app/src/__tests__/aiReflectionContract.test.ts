/**
 * AI Daily Reflection — routing/premium-gating/state-handling contract.
 *
 * Same rationale as pregnancyContract.test.ts: this project deliberately
 * does not render components in Jest (see jest.config.js), so these tests
 * assert the same class of invariant navigationGraph.test.ts already
 * protects elsewhere — every surface is reachable, gated correctly, and
 * degrades to nothing rather than an error.
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

describe('AI Daily Reflection endpoint', () => {
  it('is defined and matches the backend route', () => {
    expect(API_ENDPOINTS.AI_DAILY_REFLECTION).toBe('/api/ai/daily-reflection/');
  });

  it('the service calls exactly this endpoint, GET only', () => {
    const src = read('api/services/aiReflectionService.ts');
    expect(src).toMatch(/apiClient\.get.*API_ENDPOINTS\.AI_DAILY_REFLECTION/);
    // No POST/PUT/PATCH/DELETE anywhere in this file — the mobile app
    // only ever reads a reflection, never writes one.
    expect(src).not.toMatch(/apiClient\.(post|put|patch|delete)/);
  });

  it('mobile never constructs a Qwen/NexusLLM URL directly', () => {
    const src = read('api/services/aiReflectionService.ts');
    expect(src).not.toMatch(/192\.168\.|nexusllm|chat\/completions/i);
  });
});

describe('AI Daily Reflection premium gating', () => {
  it('the hook is gated on the shared premium-status hook, not a bespoke check', () => {
    const src = read('hooks/queries/useDailyReflection.ts');
    expect(src).toMatch(/usePremiumStatus/);
    expect(src).toMatch(/enabled:.*isPremium/s);
  });

  it('the hook never retries synchronously (AI failure must not block the UI)', () => {
    const src = read('hooks/queries/useDailyReflection.ts');
    expect(src).toMatch(/retry:\s*false/);
  });
});

describe('AI Daily Reflection unavailable/loading state', () => {
  it('the card renders nothing (not an error) when no reflection is available', () => {
    const src = read('screens/home/components/DailyReflectionCard.tsx');
    expect(src).toMatch(/if\s*\(!reflection\)\s*\{\s*return null/);
  });

  it('the card does not render its own loading spinner or error banner', () => {
    const src = read('screens/home/components/DailyReflectionCard.tsx');
    expect(src).not.toMatch(/ActivityIndicator/);
    expect(src).not.toMatch(/ErrorState/);
  });

  it('the hook collapses every failure mode to the same "no reflection" shape — no separate error state exposed', () => {
    const src = read('hooks/queries/useDailyReflection.ts');
    // Only isLoading/reflection are returned — no `error`/`isError` field
    // for the card to have to interpret or, worse, display.
    expect(src).toMatch(/return\s*\{\s*isLoading/);
    expect(src).not.toMatch(/isError/);
  });
});

describe('AI Daily Reflection reachability and scope', () => {
  it('is rendered from Home, not a new screen/route', () => {
    const homeSrc = read('screens/home/HomeScreen.tsx');
    expect(homeSrc).toMatch(/<DailyReflectionCard/);
  });

  it('does not register a new navigator/tab/route', () => {
    const navTypes = read('navigation/types.ts');
    expect(navTypes).not.toMatch(/AiReflection|DailyReflection|AIChat/);
    const mainNav = read('navigation/MainNavigator.tsx');
    expect(mainNav).not.toMatch(/AiReflection|DailyReflection|AIChat/i);
  });

  it('the card contains only Persian user-facing copy, no hardcoded English UI strings', () => {
    const src = read('screens/home/components/DailyReflectionCard.tsx');
    // Every literal passed to <Text> in this file must be Persian —
    // there is exactly one hardcoded label ("بازتاب هوشمند"); everything
    // else is server data. This just guards that label doesn't regress
    // to English.
    expect(src).toMatch(/بازتاب هوشمند/);
    expect(src).not.toMatch(/>{?['"]?[A-Za-z]{4,}/); // no stray English JSX text nodes
  });

  it('the disclaimer/limitations are rendered exactly as the backend sent them (no client-side rewriting)', () => {
    const src = read('screens/home/components/DailyReflectionCard.tsx');
    expect(src).toMatch(/reflection\.limitations\.map/);
    expect(src).not.toMatch(/توصیه پزشکی نیست|جایگزین مشاوره/); // no invented disclaimer text on the client
  });
});
