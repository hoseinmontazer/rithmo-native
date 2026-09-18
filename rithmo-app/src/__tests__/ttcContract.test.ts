/**
 * TTC (Trying To Conceive) Mode (P1.4.1) — routing/premium-gating/
 * state-handling/safety contract. Same source-scanning technique as
 * pregnancyContract.test.ts/pregnancyTimelineContract.test.ts (this
 * project verifies component rendering on-device, not in Jest — see
 * jest.config.js's own note).
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

import { API_ENDPOINTS } from '@constants/config';

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

describe('TTC endpoint', () => {
  it('is defined and matches the backend route', () => {
    expect(API_ENDPOINTS.INTELLIGENCE_TTC).toBe('/api/intelligence/ttc/');
  });

  it('the TTC service calls exactly this endpoint for both getStatus and sendAction', () => {
    const src = read('api/services/ttcService.ts');
    expect(src).toMatch(/getStatus[^]*apiClient\.get(?:<[^>]*>)?\(API_ENDPOINTS\.INTELLIGENCE_TTC\)/);
    expect(src).toMatch(/sendAction[^]*apiClient\.post(?:<[^>]*>)?\(API_ENDPOINTS\.INTELLIGENCE_TTC/);
  });
});

describe('TTC entry routing', () => {
  it('is registered as a screen in ProfileStack', () => {
    const src = read('stacks/ProfileStack.tsx', NAV);
    expect(src).toMatch(/name="TTC"/);
  });

  it('does not add a second TTC route', () => {
    const src = read('stacks/ProfileStack.tsx', NAV);
    expect(src.match(/name="TTC"/g)?.length).toBe(1);
  });

  it('resolves to a real screen module', () => {
    const base = path.join(SRC, 'screens', 'ttc', 'TTCScreen');
    expect(fs.existsSync(`${base}.tsx`)).toBe(true);
  });

  it('has at least one incoming navigation call from outside the navigator', () => {
    const callers = SOURCES.filter(
      (s) => !s.file.startsWith('navigation') && /['"]TTC['"]/.test(s.text)
        && /navigate\(/.test(s.text),
    );
    expect(callers.length).toBeGreaterThan(0);
  });

  it('is reachable from the Profile menu', () => {
    const src = read('screens/profile/ProfileScreen.tsx');
    expect(src).toMatch(/navigate\('TTC'\)/);
  });

  it('has a navigation title so the header is never blank', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { navTitles } = require('@i18n/strings.fa');
    expect(navTitles.TTC).toBeTruthy();
  });

  it("the Profile entry uses the Persian label تلاش برای بارداری", () => {
    const src = read('screens/profile/ProfileScreen.tsx');
    expect(src).toContain('تلاش برای بارداری');
  });
});

describe('TTC premium gating', () => {
  it('wraps the screen content in the shared PremiumGate, not a bespoke paywall', () => {
    const src = read('screens/ttc/TTCScreen.tsx');
    expect(src).toMatch(/<PremiumGate/);
    expect(src).not.toMatch(/UpgradeScreen/);
  });

  it('the status query is gated on the shared premium-status hook, not a bespoke check', () => {
    const src = read('hooks/queries/useTTC.ts');
    expect(src).toMatch(/export function useTTCStatus[^]*usePremiumStatus/);
  });

  it('is not fetched at all for a non-premium/unauthenticated user (enabled gate, not a client-side hide)', () => {
    const src = read('hooks/queries/useTTC.ts');
    expect(src).toMatch(/export function useTTCStatus[^]*enabled:[^]*isPremium/);
  });
});

describe('TTC setup/status state handling', () => {
  it('branches on status to choose setup vs. status content', () => {
    const src = read('screens/ttc/TTCScreen.tsx');
    expect(src).toMatch(/status/);
    expect(src).toMatch(/TTCSetupScreen/);
    expect(src).toMatch(/TTCStatusScreen/);
  });

  it('the status screen never computes cycles_trying, a date, or a fertility value itself — only displays API data', () => {
    const src = read('screens/ttc/TTCStatusScreen.tsx');
    expect(src).not.toMatch(/getTime\(\)\s*-\s*.*getTime\(\)/);
    expect(src).not.toMatch(/setDate\(|getDay\(\)/);
    expect(src).toMatch(/data\.cycles_trying/);
    expect(src).toMatch(/data\.status/);
  });

  it('the status screen reuses the existing FertileWindowCard rather than a second fertility UI', () => {
    const src = read('screens/ttc/TTCStatusScreen.tsx');
    expect(src).toMatch(/import \{ FertileWindowCard \} from '@screens\/insights\/components\/FertileWindowCard'/);
    expect(src).toMatch(/<FertileWindowCard\s*\/>/);
  });

  it('renders the backend disclaimer verbatim', () => {
    const src = read('screens/ttc/TTCStatusScreen.tsx');
    expect(src).toMatch(/data\.disclaimer_fa/);
  });

  it('translates cycle_summary.confidence_label through the shared i18n boundary rather than rendering the raw machine value ("high"/"medium"/"low")', () => {
    const src = read('screens/ttc/TTCStatusScreen.tsx');
    expect(src).toMatch(/import \{ confidenceLabel \} from '@i18n'/);
    expect(src).toMatch(/confidenceLabel\(data\.cycle_summary\.confidence_label\)/);
    expect(src).not.toMatch(/\{data\.cycle_summary\.confidence_label\}/);
  });

  it('offers pause and end via the shared mutations, not a bespoke form', () => {
    const src = read('screens/ttc/TTCStatusScreen.tsx');
    expect(src).toMatch(/usePauseTTC/);
    expect(src).toMatch(/useEndTTC/);
    expect(src).toMatch(/<ConfirmSheet/);
  });

  it('the setup screen never computes a fertility value — it only submits a date', () => {
    const src = read('screens/ttc/TTCSetupScreen.tsx');
    expect(src).not.toMatch(/ovulat|fertil/i);
    expect(src).toMatch(/useStartTTC/);
  });
});

describe('TTC hooks — no client-side fertility or date math', () => {
  it('useTTC.ts never computes an ovulation/fertility value or a date diff itself', () => {
    const src = read('hooks/queries/useTTC.ts');
    expect(src).not.toMatch(/ovulat|fertil.*(compute|calculat)/i);
    expect(src).not.toMatch(/getTime\(\)\s*-\s*.*getTime\(\)/);
  });

  it('every mutation invalidates the shared ttc query key group, not an ad-hoc refetch', () => {
    const src = read('hooks/queries/useTTC.ts');
    expect(src).toMatch(/queryKeys\.ttc\.all\(\)/);
  });
});

describe('TTC safety — no probability, conception-guarantee, or diagnostic language', () => {
  // No bare "%" check here (unlike the backend safety tests): legitimate
  // CSS percentage values (e.g. `maxHeight: '75%'`) would false-positive
  // on it, and the Persian words below are what actually carries a
  // probability/diagnosis/guarantee claim.
  const BANNED = /درصد|احتمال|تضمین|تشخیص|بهترین روز/;

  it('no TTC screen contains banned probability/diagnosis/guarantee language', () => {
    const files = [
      'screens/ttc/TTCScreen.tsx',
      'screens/ttc/TTCSetupScreen.tsx',
      'screens/ttc/TTCStatusScreen.tsx',
    ];
    for (const f of files) {
      const src = read(f);
      expect(src).not.toMatch(BANNED);
    }
  });

  it('does not add a chart-library dependency', () => {
    const files = [
      'screens/ttc/TTCScreen.tsx',
      'screens/ttc/TTCSetupScreen.tsx',
      'screens/ttc/TTCStatusScreen.tsx',
    ];
    for (const f of files) {
      const src = read(f);
      expect(src).not.toMatch(/from ['"](react-native-svg|victory-native|react-native-chart-kit|d3)['"]/i);
    }
  });

  it('every hardcoded UI label in the TTC screens is Persian, never English UI text', () => {
    const files = [
      'screens/ttc/TTCSetupScreen.tsx',
      'screens/ttc/TTCStatusScreen.tsx',
    ];
    for (const f of files) {
      const src = read(f);
      expect(src).not.toMatch(/>{?['"]?[A-Za-z]{4,}/);
    }
  });
});
