/**
 * Regression guard: useKnowledgeToday must stay enabled for every
 * authenticated user, never gated on premium status — unlike
 * useDailyReflection, which is Premium-only by design. The Living
 * Health Knowledge Layer must show free users a real, if smaller, slice
 * of content; that split happens entirely server-side (knowledge/views.py).
 *
 * A static source check, not a rendered-component test: this project
 * has no React component-rendering test setup (see jest.config.js's own
 * docstring — mobile UI is verified on a physical device instead), so
 * this mirrors navigationGraph.test.ts's approach of asserting against
 * the source text itself for a rule that's cheap and meaningful to check
 * that way.
 */
import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'hooks', 'queries', 'useKnowledgeToday.ts'),
  'utf8',
);

describe('useKnowledgeToday', () => {
  it('is enabled for any authenticated user, not gated on premium status', () => {
    expect(SOURCE).toMatch(/enabled:\s*isAuthenticated\s*,/);
    expect(SOURCE).not.toMatch(/isPremium/);
    expect(SOURCE).not.toMatch(/usePremiumStatus/);
  });
});
