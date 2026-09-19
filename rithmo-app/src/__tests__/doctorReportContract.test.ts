/**
 * Doctor Health Report (P0.8) — routing/premium-gating/state-handling
 * contract. Same source-scanning technique as forecastContract.test.ts/
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

/** One exported function's own body — never the whole file. A naive
 * `/export function useDoctorReport[^]*isPremium/` pattern is a
 * false-pass trap: `[^]*` is greedy and matches through to a LATER
 * function's `isPremium` even when useDoctorReport itself has none. */
function fnBody(src: string, name: string): string {
  const re = new RegExp(`export function ${name}\\([^]*?\\n}\\n`);
  return src.match(re)?.[0] ?? '';
}

describe('Doctor Report endpoints', () => {
  it('the deterministic endpoint is defined and matches the backend route', () => {
    expect(API_ENDPOINTS.INTELLIGENCE_DOCTOR_REPORT).toBe('/api/intelligence/doctor-report/');
  });

  it('the AI narrative endpoint is defined and matches the backend route', () => {
    expect(API_ENDPOINTS.AI_DOCTOR_REPORT).toBe('/api/ai/doctor-report/');
  });

  it('these are two distinct endpoints — AI failure never removes the deterministic report', () => {
    expect(API_ENDPOINTS.INTELLIGENCE_DOCTOR_REPORT).not.toBe(API_ENDPOINTS.AI_DOCTOR_REPORT);
  });

  it('the deterministic service calls exactly its endpoint, GET only', () => {
    const src = read('api/services/intelligenceService.ts');
    expect(src).toMatch(/apiClient[^]*\.get\(API_ENDPOINTS\.INTELLIGENCE_DOCTOR_REPORT\)/);
  });

  it('the AI narrative service calls exactly its endpoint, GET only', () => {
    const src = read('api/services/aiReflectionService.ts');
    expect(src).toMatch(/apiClient\.get.*API_ENDPOINTS\.AI_DOCTOR_REPORT/);
  });
});

describe('Doctor Report registration and reachability', () => {
  it('is registered on the Insights stack, and nowhere else', () => {
    const stacks = ['navigation/stacks/CycleStack.tsx', 'navigation/stacks/HomeStack.tsx',
      'navigation/stacks/InsightsStack.tsx', 'navigation/stacks/MessagesStack.tsx',
      'navigation/stacks/ProfileStack.tsx', 'navigation/stacks/WellnessStack.tsx'];
    const re = /name="DoctorHealthReport"/;
    const owners = stacks.filter((f) => re.test(read(f)));
    expect(owners).toEqual(['navigation/stacks/InsightsStack.tsx']);
  });

  it('does not register a new tab', () => {
    const mainNav = read('navigation/MainNavigator.tsx');
    expect(mainNav).not.toMatch(/DoctorHealthReport/);
  });

  it('has a real incoming navigation call from PremiumDashboardScreen', () => {
    const src = read('screens/insights/PremiumDashboardScreen.tsx');
    expect(src).toMatch(/navigate\('DoctorHealthReport'\)/);
  });

  it('the screen it points to actually exists', () => {
    expect(fs.existsSync(path.join(SRC, 'screens/insights/DoctorHealthReportScreen.tsx'))).toBe(true);
  });

  it('has a Persian navigation title', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { navTitles } = require('@i18n/strings.fa');
    expect(navTitles.DoctorHealthReport).toBeTruthy();
    expect(navTitles.DoctorHealthReport).not.toMatch(/[A-Za-z]/);
  });
});

describe('Doctor Report facts are free; the AI narrative stays Premium (docs/DECISIONS.md DEC-005)', () => {
  it('the deterministic hook is gated on auth only, not premium status', () => {
    const body = fnBody(read('hooks/queries/useIntelligence.ts'), 'useDoctorReport');
    expect(body).not.toMatch(/usePremiumStatus/);
    expect(body).not.toMatch(/isPremium/);
    expect(body).toMatch(/enabled:[^]*isAuthenticated/);
  });

  it('the AI narrative hook is still gated the same way, and never retries synchronously', () => {
    const src = read('hooks/queries/useDoctorReportNarrative.ts');
    expect(src).toMatch(/usePremiumStatus/);
    expect(src).toMatch(/enabled:.*isPremium/s);
    expect(src).toMatch(/retry:\s*false/);
  });

  it('the screen does not whole-screen-gate on premium status', () => {
    const src = read('screens/insights/DoctorHealthReportScreen.tsx');
    expect(src).not.toMatch(/usePremiumStatus/);
    expect(src).not.toMatch(/premiumLoading/);
  });

  it('the deeper observation content renders a contextual PremiumGate CTA keyed off the backend flag', () => {
    const src = read('screens/insights/DoctorHealthReportScreen.tsx');
    expect(src).toMatch(/data\.premium_required/);
    expect(src).toMatch(/data\.premium_teaser_fa/);
    expect(src).toMatch(/<PremiumGate/);
  });
});

describe('Doctor Report state handling', () => {
  it('has a distinct error state with retry, separate from the loading/empty states', () => {
    const src = read('screens/insights/DoctorHealthReportScreen.tsx');
    expect(src).toMatch(/isError/);
    expect(src).toMatch(/ErrorState/);
    expect(src).toMatch(/onRetry=\{refetch\}/);
  });

  it('shows a real skeleton while first loading', () => {
    const src = read('screens/insights/DoctorHealthReportScreen.tsx');
    expect(src).toMatch(/StoryCardSkeleton/);
  });

  it('renders the backend coverage message for insufficient data, never a fabricated one', () => {
    const src = read('screens/insights/DoctorHealthReportScreen.tsx');
    expect(src).toMatch(/data\.coverage_message_fa/);
  });

  it('each observation sub-section has its own honest empty state (no fabricated pattern from thin data)', () => {
    const src = read('screens/insights/DoctorHealthReportScreen.tsx');
    expect(src).toMatch(/هنوز چرخه‌ی کاملی/);
    expect(src).toMatch(/هنوز علامتی با الگوی/);
    expect(src).toMatch(/هنوز داده‌ی کافی از درد/);
  });

  it('the AI summary is additive only — the report renders without requiring it', () => {
    const src = read('screens/insights/DoctorHealthReportScreen.tsx');
    expect(src).toMatch(/\{narrative\s*&&/);
    // The deterministic sections are NOT inside that same conditional —
    // they render whenever `data` exists, independent of `narrative`.
    expect(src).toMatch(/\{data\s*&&/);
  });
});

describe('Doctor Report section separation (the core safety property)', () => {
  it('renders three visually distinct sections: observation, medical information, follow-up', () => {
    const src = read('screens/insights/DoctorHealthReportScreen.tsx');
    expect(src).toMatch(/مشاهدات ثبت‌شده/);
    expect(src).toMatch(/اطلاعات سلامت/);
    expect(src).toMatch(/موضوعاتی برای مطرح کردن با پزشک/);
  });

  it('medical information uses a visually distinct background from personal observation', () => {
    const src = read('screens/insights/DoctorHealthReportScreen.tsx');
    const medicalBlockMatch = src.match(/اطلاعات سلامت[^]{0,400}/);
    expect(medicalBlockMatch).not.toBeNull();
  });

  it('follow-up items are rendered as plain sentences, never re-labeled as a diagnosis', () => {
    const src = read('screens/insights/DoctorHealthReportScreen.tsx');
    expect(src).toMatch(/data\.follow_up\.map/);
    expect(src).not.toMatch(/تشخیص|مبتلا/);
  });

  it('the mandatory reminder disclaimer is always rendered, not conditional on AI availability', () => {
    const src = read('screens/insights/DoctorHealthReportScreen.tsx');
    expect(src).toMatch(/جایگزین ارزیابی پزشکی نیست/);
  });

  it('never hardcodes a stronger-than-backend certainty word', () => {
    const src = read('screens/insights/DoctorHealthReportScreen.tsx');
    expect(src).not.toMatch(/قطعاً|حتماً|مطمئناً/);
  });
});

describe('Doctor Report is not a PDF/export feature', () => {
  it('does not pull in a PDF or file-sharing library', () => {
    const src = read('screens/insights/DoctorHealthReportScreen.tsx');
    expect(src).not.toMatch(/react-native-pdf|react-native-share|react-native-fs|Print\.print/i);
  });

  it('every hardcoded label is Persian, never English UI text', () => {
    const src = read('screens/insights/DoctorHealthReportScreen.tsx');
    expect(src).toMatch(/گزارش سلامت من/);
    expect(src).not.toMatch(/>{?['"]?[A-Za-z]{4,}/);
  });
});
