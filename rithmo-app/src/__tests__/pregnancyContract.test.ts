/**
 * Pregnancy — routing, premium-gating, and state-branching contract.
 *
 * This project deliberately does not test component rendering in Jest (see
 * jest.config.js's own note — rendering is verified on a physical device).
 * These tests instead assert the same invariants navigationGraph.test.ts
 * already protects for the rest of the app: every registered route has a
 * real way in, and the screens that decide what to show branch on the
 * conditions the spec requires (premium gate, then active-pregnancy state).
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

import { SYMPTOMS, toSymptomCode } from '@constants/symptoms';

const SRC = path.join(__dirname, '..');
const NAV = path.join(SRC, 'navigation');

function read(rel: string, base: string = SRC): string {
  return fs.readFileSync(path.join(base, rel), 'utf8');
}

function allSources(): Array<{ file: string; text: string }> {
  const out: Array<{ file: string; text: string }> = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'node_modules' && e.name !== '__tests__') { walk(full); }
      } else if (/\.tsx?$/.test(e.name)) {
        out.push({ file: path.relative(SRC, full), text: fs.readFileSync(full, 'utf8') });
      }
    }
  };
  walk(SRC);
  return out;
}

const SOURCES = allSources();

describe('Pregnancy entry routing', () => {
  it('is registered as a screen in ProfileStack', () => {
    const src = read('stacks/ProfileStack.tsx', NAV);
    expect(src).toMatch(/name="Pregnancy"/);
  });

  it('resolves to a real screen module', () => {
    const base = path.join(SRC, 'screens', 'pregnancy', 'PregnancyScreen');
    expect(fs.existsSync(`${base}.tsx`)).toBe(true);
  });

  it('has at least one incoming navigation call from outside the navigator', () => {
    const callers = SOURCES.filter(
      (s) => !s.file.startsWith('navigation') && /['"]Pregnancy['"]/.test(s.text)
        && /navigate\(/.test(s.text),
    );
    expect(callers.length).toBeGreaterThan(0);
  });

  it('is reachable from the Profile menu', () => {
    const src = read('screens/profile/ProfileScreen.tsx');
    expect(src).toMatch(/navigate\('Pregnancy'\)/);
  });

  it('is reachable from the Home context strip', () => {
    const src = read('screens/home/HomeScreen.tsx');
    expect(src).toMatch(/screen:\s*'Pregnancy'/);
  });

  it('has a navigation title so the header is never blank', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { navTitles } = require('@i18n/strings.fa');
    expect(navTitles.Pregnancy).toBeTruthy();
  });
});

describe('Pregnancy premium gating', () => {
  it('wraps the screen content in the shared PremiumGate, not a bespoke paywall', () => {
    const src = read('screens/pregnancy/PregnancyScreen.tsx');
    expect(src).toMatch(/<PremiumGate/);
    expect(src).not.toMatch(/UpgradeScreen/); // no duplicate/second paywall route dispatch here
  });

  it('every pregnancy screen relies on the shared premium-status hook, not a private check', () => {
    const files = ['screens/pregnancy/PregnancyScreen.tsx'];
    for (const f of files) {
      const src = read(f);
      // Either directly via PremiumGate (which itself uses usePremiumStatus)
      // or explicitly — never a hand-rolled subscription check.
      expect(src.includes('PremiumGate') || src.includes('usePremiumStatus')).toBe(true);
    }
  });
});

describe('Pregnancy setup/status state handling', () => {
  it('branches on has_active_pregnancy to choose setup vs. status content', () => {
    const src = read('screens/pregnancy/PregnancyScreen.tsx');
    expect(src).toMatch(/has_active_pregnancy/);
    expect(src).toMatch(/PregnancySetupScreen/);
    expect(src).toMatch(/PregnancyStatusScreen/);
  });

  it('the status screen never computes gestational values itself — only displays API data', () => {
    const src = read('screens/pregnancy/PregnancyStatusScreen.tsx');
    // The one thing that must NEVER appear here: local date-diff arithmetic
    // reconstructing gestational_week/day. The screen must read them off
    // `data`, not derive them.
    expect(src).not.toMatch(/getTime\(\)\s*-\s*.*getTime\(\)/);
    expect(src).toMatch(/data\.gestational_week/);
    expect(src).toMatch(/data\.gestational_day/);
    expect(src).toMatch(/data\.trimester/);
  });

  it('the status screen routes "log how you feel" into the existing QuickLog flow', () => {
    const src = read('screens/pregnancy/PregnancyStatusScreen.tsx');
    expect(src).toMatch(/screen:\s*'QuickLog'/);
  });

  it('the status screen offers ending pregnancy mode via a plain confirmation, not a form', () => {
    const src = read('screens/pregnancy/PregnancyStatusScreen.tsx');
    expect(src).toMatch(/<ConfirmSheet/);
    expect(src).toMatch(/useEndPregnancy/);
  });
});

describe('Pregnancy symptom vocabulary', () => {
  it('adds heartburn and swelling without removing any existing code', () => {
    const codes = SYMPTOMS.map((s) => s.code);
    expect(codes).toEqual(expect.arrayContaining([
      'cramps', 'headache', 'fatigue', 'nausea', 'backache', // pre-existing
      'heartburn', 'swelling', // new
    ]));
  });

  it('resolves the Persian labels for the new codes back to their codes', () => {
    expect(toSymptomCode('سوزش سردل')).toBe('heartburn');
    expect(toSymptomCode('ورم')).toBe('swelling');
  });
});
