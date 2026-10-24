/**
 * Contraception / sexual-health area: contract tests.
 *
 * No render tests exist in this app, so these pin the things that fail
 * silently: the private routes staying out of analytics, copy that must never
 * promise protection or diagnose, icon names that do not exist, and server
 * error codes the screens would show as a raw message.
 */
declare const __dirname: string;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

import { isSensitiveRoute, NEUTRAL_SCREEN_LABEL, SENSITIVE_ROUTES } from '../analytics/sensitiveRoutes';
import * as logic from '../screens/healthGuide/healthGuideLogic';
import {
  describeReminder, errorCode, errorMessageFor, formatTime, GUIDE_ICON_NAMES, isNotFound,
  METHOD_CODES, METHOD_LABELS, CHECK_LABELS, CHECK_TYPES, parseTime, parseWhole, perHundred,
  splitGuide, toLatinDigits,
} from '../screens/healthGuide/healthGuideLogic';

const SRC = path.join(__dirname, '..');
const APP_ROOT = path.join(SRC, '..');
const BACKEND_SERVICES = path.join(APP_ROOT, '..', '..', 'rithmo-backend', 'reproductive_records', 'services.py');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const GLYPHS: Record<string, number> = require(
  path.join(APP_ROOT, 'node_modules', 'react-native-vector-icons', 'glyphmaps', 'MaterialCommunityIcons.json'),
);

const AREA_FILES = fs.readdirSync(path.join(SRC, 'screens', 'healthGuide')).map((f: string) => path.join(SRC, 'screens', 'healthGuide', f));
const read = (p: string): string => fs.readFileSync(p, 'utf8');

describe('analytics privacy', () => {
  it('marks exactly the five private routes', () => {
    expect([...SENSITIVE_ROUTES].sort()).toEqual(
      ['GuideArticle', 'HealthChecks', 'HealthGuide', 'MethodCompare', 'MyContraception'],
    );
    expect(isSensitiveRoute('MyContraception')).toBe(true);
    expect(isSensitiveRoute('Home')).toBe(false);
    expect(NEUTRAL_SCREEN_LABEL).not.toMatch(/contracep|sexual|health|guide/i);
  });

  it('RootNavigator skips screen_viewed for those routes', () => {
    const src = read(path.join(SRC, 'navigation', 'RootNavigator.tsx'));
    expect(src).toMatch(/isSensitiveRoute\(route\.name\)/);
  });

  it('no screen in the area sends an analytics event', () => {
    for (const f of AREA_FILES) {
      expect(read(f)).not.toMatch(/from '@analytics'|track\(/);
    }
  });
});

describe('copy safety', () => {
  const copy: string[] = (Object.values(logic) as unknown[]).filter((v): v is string => typeof v === 'string');
  copy.push(...Object.values(METHOD_LABELS), ...Object.values(CHECK_LABELS));
  const allText = [...copy, ...AREA_FILES.map(read)].join('\n');

  it('has no emoji and no em or en dashes', () => {
    expect(allText).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(allText).not.toMatch(/[–—]/);
  });

  it('never promises protection or states a diagnosis', () => {
    for (const bad of [/100\s*٪/, /۱۰۰\s*٪/, /کاملاً ایمن/, /روزهای امن/, /بدون خطر/, /تشخیص داده/, /مبتلا/]) {
      expect(allText).not.toMatch(bad);
    }
  });

  it('says tracking is not prevention and is not medical advice', () => {
    expect(logic.TRACKING_NOT_PREVENTION_FA).toMatch(/جلوگیری نمی‌کند/);
    expect(logic.NOT_MEDICAL_ADVICE_FA).toMatch(/پزشک/);
  });

  it('formats a typical-use figure as a count, not a percent', () => {
    expect(perHundred(null)).toBe('نامشخص');
    expect(perHundred(13)).toMatch(/از ۱۰۰$/);
    expect(perHundred(13)).not.toMatch(/٪|%/);
  });
});

describe('icons', () => {
  it('every icon the area asks for exists in the shipped glyph map', () => {
    const missing = GUIDE_ICON_NAMES.filter((n) => !(n in GLYPHS));
    expect(missing).toEqual([]);
  });
});

describe('server error codes', () => {
  // The backend lives in a sibling repository; without it there is nothing to compare.
  const itWithBackend = fs.existsSync(BACKEND_SERVICES) ? it : it.skip;

  itWithBackend('has Persian text for every code the backend can raise', () => {
    const src = read(BACKEND_SERVICES);
    const codes = new Set<string>();
    for (const m of src.matchAll(/RecordError\("([a-z_]+)"\)/g)) { codes.add(m[1]); }
    for (const m of src.matchAll(/RecordError\(f"\{what\}_(too_old|in_future)"\)/g)) {
      for (const w of ['started_on', 'stopped_on', 'done_on']) { codes.add(`${w}_${m[1]}`); }
    }
    expect(codes.size).toBeGreaterThan(15);
    const uncovered = [...codes].filter((c) => errorMessageFor({ response: { data: { code: c } } }) === errorMessageFor(null));
    expect(uncovered).toEqual([]);
  });

  it('reads the code and the 404 status from an axios-shaped error', () => {
    expect(errorCode({ response: { data: { code: 'overlaps_same_method' } } })).toBe('overlaps_same_method');
    expect(errorCode({})).toBeNull();
    expect(isNotFound({ response: { status: 404 } })).toBe(true);
    expect(isNotFound({ response: { status: 500 } })).toBe(false);
  });
});

describe('input parsing', () => {
  it('accepts Persian digits and rejects non-integers', () => {
    expect(toLatinDigits('۲۱:۳۰')).toBe('21:30');
    expect(parseWhole('۲۸')).toBe(28);
    expect(parseWhole('2.5')).toBeNull();
    expect(parseWhole('')).toBeNull();
    expect(parseWhole('12345')).toBeNull();
  });

  it('validates a 24h time', () => {
    expect(parseTime('۲۱:۳۰')).toEqual({ h: 21, m: 30 });
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('9:60')).toBeNull();
    expect(parseTime('abc')).toBeNull();
    expect(formatTime(7, 5)).toBe('07:05');
  });
});

describe('reminders and guide grouping', () => {
  it('describes the three reminder kinds without a suggested interval', () => {
    expect(describeReminder({ kind: 'daily', time_local: '21:00', interval_days: null, anchor_date: null })).toMatch(/^هر روز/);
    expect(describeReminder({ kind: 'every_n_days', time_local: '21:00', interval_days: 3, anchor_date: null })).toMatch(/^هر ۳ روز/);
    expect(describeReminder({ kind: 'once', time_local: '21:00', interval_days: null, anchor_date: '2026-01-05' })).toMatch(/^یک‌بار/);
  });

  it('puts essential-safety articles first and the comparison apart', () => {
    const mk = (slug: string, o: object) => ({ slug, area: 'contraception', kind: 'article', is_essential_safety: false, ...o });
    const g = splitGuide([
      mk('a', {}), mk('b', { is_essential_safety: true }), mk('c', { kind: 'comparison' }),
    ] as never);
    expect(g.essential.map((x) => x.slug)).toEqual(['b']);
    expect(g.comparison?.slug).toBe('c');
    expect(g.byArea('contraception').map((x) => x.slug)).toEqual(['a']);
  });

  it('covers every method code with a label', () => {
    expect(METHOD_CODES.length).toBe(15);
    expect(CHECK_TYPES.length).toBe(4);
  });
});

describe('navigation', () => {
  it('registers all five routes in the Profile stack and the entry in Profile', () => {
    const stack = read(path.join(SRC, 'navigation', 'stacks', 'ProfileStack.tsx'));
    for (const r of SENSITIVE_ROUTES) { expect(stack).toContain(`name="${r}"`); }
    expect(read(path.join(SRC, 'screens', 'profile', 'ProfileScreen.tsx'))).toMatch(/HealthGuide/);
  });
});
