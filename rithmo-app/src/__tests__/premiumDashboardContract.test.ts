/**
 * Premium Dashboard (P0.10) — navigation/composition/premium-gating
 * contract. Same source-scanning technique as the other *Contract.test.ts
 * files (this project verifies component rendering on-device, not in
 * Jest).
 *
 * The composition assertions below are the ones that matter most for this
 * screen specifically: it must be an assembly of EXISTING cards/hooks,
 * never a second analytics engine, and it must not have displaced the
 * inline Cycle Change / Weekly Review cards that weeklyReviewContract.test.ts
 * and cycleChangeReviewContract.test.ts already assert stay on
 * InsightsHomeScreen.
 */
// A top-level `export` makes this a module rather than a global script —
// without it, this file's `fs`/`path`/`SRC`/`read` collide at the
// type-checker level with the same names declared the same way in
// navigationGraph.test.ts (TS2451/TS2393), even though Jest runs each
// file in its own sandbox at runtime.
export {};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

const SRC = path.join(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

describe('Premium Dashboard registration and reachability', () => {
  it('is registered on the Insights stack, and nowhere else', () => {
    const stacks = ['navigation/stacks/CycleStack.tsx', 'navigation/stacks/HomeStack.tsx',
      'navigation/stacks/InsightsStack.tsx', 'navigation/stacks/MessagesStack.tsx',
      'navigation/stacks/ProfileStack.tsx', 'navigation/stacks/WellnessStack.tsx'];
    const re = /name="PremiumDashboard"/;
    const owners = stacks.filter((f) => re.test(read(f)));
    expect(owners).toEqual(['navigation/stacks/InsightsStack.tsx']);
  });

  it('has a real incoming navigation call from InsightsHomeScreen', () => {
    const src = read('screens/insights/InsightsHomeScreen.tsx');
    expect(src).toMatch(/navigate\('PremiumDashboard'\)/);
  });

  it('the screen it points to actually exists', () => {
    expect(fs.existsSync(path.join(SRC, 'screens/insights/PremiumDashboardScreen.tsx'))).toBe(true);
  });

  it('has a Persian navigation title, not a leftover English one', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { navTitles } = require('@i18n/strings.fa');
    expect(navTitles.PremiumDashboard).toBeTruthy();
    expect(navTitles.PremiumDashboard).not.toMatch(/[A-Za-z]/);
  });
});

describe('Premium Dashboard is free; only its genuinely Premium cards self-gate (docs/DECISIONS.md DEC-005)', () => {
  it('the screen itself does not whole-screen-gate on premium status', () => {
    const src = read('screens/insights/PremiumDashboardScreen.tsx');
    expect(src).not.toMatch(/usePremiumStatus/);
    expect(src).not.toMatch(/premiumLoading/);
  });

  it('still wraps the genuinely Premium-only cards (CycleChangeCard/FertileWindowCard/HealthChangeCard) in PremiumGate individually', () => {
    const src = read('screens/insights/PremiumDashboardScreen.tsx');
    expect(src).toMatch(/<PremiumGate[^]*<CycleChangeCard/);
    expect(src).toMatch(/<PremiumGate[^]*<FertileWindowCard/);
    expect(src).toMatch(/<PremiumGate[^]*<HealthChangeCard/);
  });

  it('does not wrap ForecastCard/MonthlyReviewCard in PremiumGate — they self-gate their own deeper sections internally', () => {
    const src = read('screens/insights/PremiumDashboardScreen.tsx');
    // A small window immediately before each tag, not a whole-file scan —
    // `<PremiumGate` legitimately appears earlier in the file wrapping
    // CycleChangeCard, and a greedy `[^]*` would match straight through
    // to these unrelated tags further down (the same false-pass trap
    // fixed elsewhere in this file's other tests).
    for (const tag of ['<ForecastCard', '<MonthlyReviewCard']) {
      const index = src.indexOf(tag);
      expect(index).toBeGreaterThan(-1);
      const preceding = src.slice(Math.max(0, index - 120), index);
      expect(preceding).not.toMatch(/<PremiumGate/);
    }
  });
});

describe('Premium Dashboard composition — assembly, not a second engine', () => {
  it('reuses DailyReflectionCard, CycleChangeCard, TodayInsightCard, ForecastCard and MonthlyReviewCard verbatim', () => {
    const src = read('screens/insights/PremiumDashboardScreen.tsx');
    expect(src).toMatch(/<DailyReflectionCard/);
    expect(src).toMatch(/<CycleChangeCard/);
    expect(src).toMatch(/<TodayInsightCard/);
    expect(src).toMatch(/<ForecastCard/);
    expect(src).toMatch(/<MonthlyReviewCard/);
  });

  it('does not introduce a second WeeklyReviewCard/CycleChangeCard render path, and does not duplicate their component definitions', () => {
    expect(fs.existsSync(path.join(SRC, 'screens/insights/components/PremiumDashboardCycleChangeCard.tsx'))).toBe(false);
    const src = read('screens/insights/PremiumDashboardScreen.tsx');
    expect(src).not.toMatch(/<WeeklyReviewCard/);
  });

  it('performs no local statistic/date computation of its own (imports data-fetching hooks only, no math)', () => {
    const src = read('screens/insights/PremiumDashboardScreen.tsx');
    expect(src).not.toMatch(/computeCorrelations|computeWeekComparison|Pearson/i);
  });

  it('the existing inline Cycle Change / Weekly Review cards on InsightsHomeScreen were not removed by this addition', () => {
    const src = read('screens/insights/InsightsHomeScreen.tsx');
    expect(src).toMatch(/<PremiumGate[^]*<CycleChangeCard[^]*<WeeklyReviewCard/);
  });
});

describe('Premium Dashboard uses the existing Insights navigation, not a parallel one', () => {
  it('does not register a new tab', () => {
    const mainNav = read('navigation/MainNavigator.tsx');
    expect(mainNav).not.toMatch(/PremiumDashboard/);
  });

  it('cross-navigates to InsightDetail via the existing HomeTab route, not a duplicated detail screen', () => {
    const src = read('screens/insights/PremiumDashboardScreen.tsx');
    expect(src).toMatch(/HomeTab.*InsightDetail/s);
  });
});
