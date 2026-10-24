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

import { shouldShowLogAction, LOG_ACTION_TABS } from '../navigation/logActionVisibility';
import { describeActiveRoute, isSensitiveRoute, NEUTRAL_SCREEN_LABEL, SENSITIVE_ROUTES } from '../analytics/sensitiveRoutes';
import * as logic from '../screens/healthGuide/healthGuideLogic';
import {
  describeReminder, errorCode, errorMessageFor, formatTime, GUIDE_ICON_NAMES, isNotFound,
  METHOD_CODES, METHOD_LABELS, CHECK_LABELS, CHECK_TYPES, parseTime, parseWhole, perHundred,
  CHECK_GROUPS, splitGuide, toLatinDigits, methodStatusLine, reminderStatusLine, checksStatusLine, lastDoneByType,
} from '../screens/healthGuide/healthGuideLogic';

const SRC = path.join(__dirname, '..');
const APP_ROOT = path.join(SRC, '..');
const BACKEND_SERVICES = path.join(APP_ROOT, '..', '..', 'rithmo-backend', 'reproductive_records', 'services.py');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const GLYPHS: Record<string, number> = require(
  path.join(APP_ROOT, 'node_modules', 'react-native-vector-icons', 'glyphmaps', 'MaterialCommunityIcons.json'),
);

const STACK_ROUTES = [...SENSITIVE_ROUTES].filter((r) => r !== 'HealthTab');
const AREA_FILES = fs.readdirSync(path.join(SRC, 'screens', 'healthGuide')).map((f: string) => path.join(SRC, 'screens', 'healthGuide', f));
const read = (p: string): string => fs.readFileSync(p, 'utf8');

describe('analytics privacy', () => {
  it('marks the Health tab and its five routes', () => {
    expect([...SENSITIVE_ROUTES].sort()).toEqual(
      ['GuideArticle', 'HealthChecks', 'HealthGuide', 'HealthTab', 'MethodCompare', 'MyContraception'],
    );
    expect(isSensitiveRoute('HealthTab')).toBe(true);
    expect(isSensitiveRoute('MyContraception')).toBe(true);
    expect(isSensitiveRoute('Home')).toBe(false);
    expect(NEUTRAL_SCREEN_LABEL).not.toMatch(/contracep|sexual|health|guide/i);
  });

  it('RootNavigator skips screen_viewed for those routes', () => {
    const src = read(path.join(SRC, 'navigation', 'RootNavigator.tsx'));
    expect(src).toMatch(/describeActiveRoute\(state\)/);
    expect(src).not.toMatch(/track\('screen_viewed', \{ route: route\.name/);
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

describe('bundled fallback safety cards', () => {
  it('only say who to ask and that time matters: no method, no effectiveness claim', () => {
    const cards = (logic as unknown as { ESSENTIAL_SAFETY_FALLBACK?: Array<{ text: string }> }).ESSENTIAL_SAFETY_FALLBACK;
    expect(Array.isArray(cards)).toBe(true);
    for (const c of cards ?? []) {
      expect(c.text).not.toMatch(/کاندوم|قرص|کم می‌کند|خطر .* را کم/);
    }
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

describe('screen-view reporting (behavioural)', () => {
  const nav = (leaf: object) => ({ index: 0, routes: [{ name: 'Main', state: { index: 0, routes: [leaf] } }] });

  it('reports a normal screen by name and counts it', () => {
    expect(describeActiveRoute(nav({ name: 'CycleTab' }))).toEqual({ screen: 'CycleTab', trackRoute: 'CycleTab' });
  });

  it('reports the Health tab neutrally even before its stack has rendered', () => {
    expect(describeActiveRoute(nav({ name: 'HealthTab' }))).toEqual({ screen: NEUTRAL_SCREEN_LABEL, trackRoute: null });
  });

  it('reports every child route of the Health stack neutrally, however deep', () => {
    for (const r of ['HealthGuide', 'GuideArticle', 'MethodCompare', 'MyContraception', 'HealthChecks']) {
      const state = nav({ name: 'HealthTab', state: { index: 0, routes: [{ name: r }] } });
      expect(describeActiveRoute(state)).toEqual({ screen: NEUTRAL_SCREEN_LABEL, trackRoute: null });
    }
  });

  it('never carries the route name or params of a private screen', () => {
    const out = describeActiveRoute(nav({ name: 'HealthTab', state: { index: 0, routes: [{ name: 'GuideArticle', params: { slug: 'emergency-contraception' } }] } }));
    expect(JSON.stringify(out)).not.toMatch(/Guide|slug|emergency|Health/);
  });

  it('tolerates an empty or missing state', () => {
    expect(describeActiveRoute(undefined)).toBeNull();
    expect(describeActiveRoute({ index: 0, routes: [] })).toBeNull();
  });
});

describe('floating log action visibility (behavioural)', () => {
  const state = (focused: string, nested?: { index?: number }, withLog = true) => ({
    index: 0,
    routes: [{ name: focused, state: nested }, ...(withLog ? [{ name: 'LogTab' }] : [])],
  });

  it('shows at the root of Cycle and Patterns, where nothing else opens the log', () => {
    expect([...LOG_ACTION_TABS]).toEqual(['CycleTab', 'InsightsTab']);
    for (const t of LOG_ACTION_TABS) { expect(shouldShowLogAction(state(t), false)).toBe(true); }
    expect(shouldShowLogAction(state('CycleTab', { index: 0 }), false)).toBe(true);
  });

  it('leaves Home to its own quick-log entry points, and those entry points exist', () => {
    expect(shouldShowLogAction(state('HomeTab'), false)).toBe(false);
    const home = read(path.join(SRC, 'screens', 'home', 'HomeScreen.tsx'));
    // The justification for omitting the row: Home offers these itself.
    expect(home).toMatch(/<QuickCheckInWidget onPressItem=\{goToQuickLogCategory\}/);
    expect(home).toMatch(/goToQuickLog\(\)/);
    expect(home).toMatch(/navigate\('LogTab' as any, \{ screen: 'QuickLog' \}/);
  });

  it('has no log entry on the Cycle or Patterns roots other than the row (why the row stays there)', () => {
    const cycle = read(path.join(SRC, 'screens', 'cycle', 'CycleAnalysisScreen.tsx'));
    const insights = read(path.join(SRC, 'screens', 'insights', 'InsightsHomeScreen.tsx'));
    // Cycle only offers QuickLog while pregnant (period logging otherwise).
    expect(cycle).toMatch(/isPregnant\s*\n?\s*\? \(\) => navigation\.dispatch/);
    expect(insights).not.toMatch(/name: 'LogTab'|navigate\('LogTab'/);
  });

  it('never floats over Health (urgent guidance, private records) or Profile', () => {
    expect(shouldShowLogAction(state('HealthTab'), false)).toBe(false);
    expect(shouldShowLogAction(state('ProfileTab'), false)).toBe(false);
  });

  it('hides over a pushed screen so it never covers its buttons', () => {
    expect(shouldShowLogAction(state('CycleTab', { index: 2 }), false)).toBe(false);
      });

  it('hides while the keyboard is up, on the Log screens themselves, and for partners', () => {
    expect(shouldShowLogAction(state('CycleTab'), true)).toBe(false);
    expect(shouldShowLogAction(state('LogTab'), false)).toBe(false);
    expect(shouldShowLogAction(state('CycleTab', undefined, false), false)).toBe(false);
  });
});

describe('hub status lines', () => {
  it('names the recorded method, or says none is recorded', () => {
    expect(methodStatusLine([])).toBe('هنوز روشی ثبت نکرده‌ای');
    expect(methodStatusLine([{ method: 'combined_pill' }])).toBe(METHOD_LABELS.combined_pill);
    expect(methodStatusLine([{ method: 'combined_pill' }, { method: 'male_condom' }])).toMatch(/و ۱ روش دیگر$/);
  });

  it('counts active reminders and reports a pregnancy pause or all-off state', () => {
    expect(reminderStatusLine([])).toBe('یادآوری نساخته‌ای');
    expect(reminderStatusLine([{ is_active: true, paused: false }, { is_active: false, paused: false }])).toBe('۱ یادآور فعال');
    expect(reminderStatusLine([{ is_active: false, paused: false }])).toBe('یادآورها خاموش‌اند');
    expect(reminderStatusLine([{ is_active: true, paused: true }])).toMatch(/متوقف/);
  });

  it('keeps the newest date per check type and never invents a due state', () => {
    const rows = [
      { id: 1, check_type: 'checkup', done_on: '2026-01-05', next_due: null },
      { id: 2, check_type: 'checkup', done_on: '2026-03-01', next_due: null },
      { id: 3, check_type: 'hpv_vaccine', done_on: '2026-02-01', next_due: null },
    ] as never;
    const last = lastDoneByType(rows);
    expect(last.checkup?.id).toBe(2);
    expect(last.hpv_vaccine?.id).toBe(3);
    expect(last.sti_screening).toBeUndefined();
    expect(checksStatusLine([] as never)).toBe('چیزی ثبت نشده');
    expect(checksStatusLine(rows)).toMatch(/^آخرین ثبت: /);
  });

  it('never words a due, overdue or recommended state', () => {
    const src = read(path.join(SRC, 'screens', 'healthGuide', 'HealthChecksScreen.tsx'))
      + read(path.join(SRC, 'screens', 'healthGuide', 'HealthGuideHubScreen.tsx'));
    expect(src).not.toMatch(/موعد گذشته|عقب‌افتاده|باید .*آزمایش|توصیه می‌شود/);
  });

  it('orders the hub: my method, tests and vaccines, urgent help, then learning', () => {
    const hub = read(path.join(SRC, 'screens', 'healthGuide', 'HealthGuideHubScreen.tsx'));
    const at = (t: string) => hub.indexOf(`${t}}</SectionTitle>`);
    // The method card labels itself, so it has no section heading of its own.
    expect(hub.indexOf('<MethodHero')).toBeGreaterThan(-1);
    expect(hub.indexOf('<MethodHero')).toBeLessThan(at('HUB_SECTION_RECORDS_FA'));
    expect(at('HUB_SECTION_RECORDS_FA')).toBeLessThan(at('HUB_SECTION_URGENT_FA'));
    expect(at('HUB_SECTION_URGENT_FA')).toBeLessThan(at('HUB_SECTION_LEARN_FA'));
  });

  it('reaches each destination once from the hub, with tests and vaccines kept apart', () => {
    const hub = read(path.join(SRC, 'screens', 'healthGuide', 'HealthGuideHubScreen.tsx'));
    expect(hub).toContain("navigation.navigate('MyContraception')");
    expect(hub).toContain("navigate('MyContraception', { intent: 'add_method' })");
    expect(hub).toContain("navigate('HealthChecks', { kind: 'tests' })");
    expect(hub).toContain("navigate('HealthChecks', { kind: 'vaccines' })");
    expect(hub).toContain("navigation.navigate('MethodCompare')");
  });

  it('splits the four check types into tests and vaccines with nothing left over', () => {
    const all = [...CHECK_GROUPS.tests.types, ...CHECK_GROUPS.vaccines.types].sort();
    expect(all).toEqual([...CHECK_TYPES].sort());
    const rows = [
      { id: 1, check_type: 'hpv_vaccine', done_on: '2026-02-01', next_due: null },
      { id: 2, check_type: 'checkup', done_on: '2026-03-01', next_due: null },
    ] as never;
    expect(checksStatusLine(rows, 'vaccines')).toMatch(/^آخرین ثبت: /);
    expect(checksStatusLine([rows[0]] as never, 'tests')).toBe('چیزی ثبت نشده');
  });

  it('shows urgent help as one always-open panel, for approved and fallback content alike', () => {
    const hub = read(path.join(SRC, 'screens', 'healthGuide', 'HealthGuideHubScreen.tsx'));
    expect(hub.match(/<UrgentHelp/g)?.length).toBe(2);
    expect(hub).not.toMatch(/Collapsible|useState/);
    expect(read(path.join(SRC, 'screens', 'healthGuide', 'components.tsx'))).toMatch(/export function UrgentHelp/);
  });

  it('shows each disclaimer once on My Contraception', () => {
    const mc = read(path.join(SRC, 'screens', 'healthGuide', 'MyContraceptionScreen.tsx'));
    expect(mc.match(/\{s\.disclaimer_fa \|\| TRACKING_NOT_PREVENTION_FA\}/g)?.length).toBe(1);
    expect(mc.match(/\{TRACKING_NOT_PREVENTION_FA\}/g)?.length ?? 0).toBe(0);
  });

  it('adds no test-result or tracking-dashboard wording', () => {
    const src = read(path.join(SRC, 'screens', 'healthGuide', 'HealthGuideHubScreen.tsx'))
      + read(path.join(SRC, 'screens', 'healthGuide', 'HealthChecksScreen.tsx'));
    expect(src).not.toMatch(/نتیجه‌ی آزمایش|داشبورد|امتیاز|پیشرفت/);
  });
});

describe('navigation', () => {
  const main = read(path.join(SRC, 'navigation', 'MainNavigator.tsx'));
  const profileStack = read(path.join(SRC, 'navigation', 'stacks', 'ProfileStack.tsx'));
  const healthStack = read(path.join(SRC, 'navigation', 'stacks', 'HealthStack.tsx'));

  it('mounts all five routes in one Health stack, starting at the hub', () => {
    for (const r of STACK_ROUTES) { expect(healthStack).toContain(`name="${r}"`); }
    expect(healthStack).toMatch(/initialRouteName="HealthGuide"/);
  });

  it('keeps no second copy of the routes or screens in the Profile stack', () => {
    for (const r of STACK_ROUTES) { expect(profileStack).not.toContain(`name="${r}"`); }
    expect(profileStack).not.toMatch(/screens\/healthGuide/);
  });

  it('has no Health entry left in the Profile screen', () => {
    const profile = read(path.join(SRC, 'screens', 'profile', 'ProfileScreen.tsx'));
    expect(profile).not.toMatch(/HealthGuide|healthGuide|سلامت جنسی و پیشگیری/);
  });

  it('registers a Health tab for every role, outside the owner-only block', () => {
    expect(main).toMatch(/name="HealthTab"/);
    const ownerOnly = main.slice(main.indexOf('{!isPartner && ('), main.indexOf('</>\n      )}'));
    expect(ownerOnly).not.toContain('HealthTab');
    expect(main.indexOf('name="HealthTab"')).toBeGreaterThan(main.indexOf('</>\n      )}'));
  });

  it('types the Health tab and its routes, and no health route remains under Profile', () => {
    const types = read(path.join(SRC, 'navigation', 'types.ts'));
    expect(types).toMatch(/HealthTab:\s+undefined/);
    const health = types.slice(types.indexOf('export type HealthStackParamList'));
    for (const r of STACK_ROUTES) { expect(health.slice(0, health.indexOf('\n};'))).toContain(`${r}:`); }
    const profile = types.slice(types.indexOf('export type ProfileStackParamList'));
    expect(profile.slice(0, profile.indexOf('\n};'))).not.toMatch(/HealthGuide|MyContraception|HealthChecks|MethodCompare|GuideArticle/);
  });

  it('shows the neutral label for the tab itself, never its name', () => {
    expect(NEUTRAL_SCREEN_LABEL).toBe('PrivateArea');
    expect(read(path.join(SRC, 'navigation', 'RootNavigator.tsx'))).toMatch(/describeActiveRoute/);
  });

  it('reaches the paywall through the Profile tab, since Upgrade lives there', () => {
    expect(read(path.join(SRC, 'screens', 'healthGuide', 'MyContraceptionScreen.tsx'))).toMatch(/'ProfileTab'/);
  });

  it('gives the five destinations equal slots, with no per-tab width arithmetic', () => {
    expect(main).not.toMatch(/SIDE_BEFORE_LOG|LOG_SLOT|flex: 1\.5/);
    const visibleTabs = ['HomeTab', 'CycleTab', 'InsightsTab', 'HealthTab', 'ProfileTab'];
    for (const t of visibleTabs) { expect(main).toContain(`name="${t}"`); }
    // Only the hidden Log route sets an item style, and it removes the slot entirely.
    expect(main.match(/tabBarItemStyle/g)?.length).toBe(1);
    expect(main).toMatch(/tabBarItemStyle: \{ display: 'none' \}/);
  });

  it('keeps LogTab registered for navigation but out of the bar', () => {
    expect(main).toMatch(/name="LogTab"[\s\S]{0,200}tabBarButton: \(\) => null/);
    // Existing entry points still resolve to the route.
    expect(read(path.join(SRC, 'screens', 'home', 'HomeScreen.tsx'))).toMatch(/'LogTab'/);
    expect(read(path.join(SRC, 'navigation', 'navigationRef.ts'))).toMatch(/tab: 'LogTab'/);
  });

  it('opens QuickLog from an action row that is not part of the destination row', () => {
    expect(main).toMatch(/navigate\('LogTab', \{ screen: 'QuickLog' \}\)/);
    expect(main).toMatch(/accessibilityLabel="ثبت سریع امروز"/);
    expect(main).toMatch(/tabBar=\{\(props\) => <MainTabBar \{\.\.\.props\} \/>\}/);
  });

  it('keeps the action in the bar layout, never over the content', () => {
    const bar = main.slice(main.indexOf('function MainTabBar'), main.indexOf('// ── Navigator'));
    // A row rendered before BottomTabBar takes its height from the screen area.
    expect(bar.indexOf('showLog ?')).toBeGreaterThan(-1);
    expect(bar.indexOf('showLog ?')).toBeLessThan(bar.indexOf('<BottomTabBar'));
    // The overlay approach (absolute positioning above the bar) is what covered text.
    expect(bar).not.toMatch(/position: 'absolute'|bottom: '100%'|marginBottom/);
    expect(main).not.toMatch(/logAction:/);
  });

  it('gives the action a comfortable touch target and a visible label', () => {
    expect(main).toMatch(/const LOG_ACTION_HEIGHT = 44;/);
    expect(main).toMatch(/>ثبت امروز<\/Text>/);
  });

  it('omits the Log route, and so the action, for partners', () => {
    expect(main).toMatch(/\{!isPartner && \(/);
    const ownerBlock = main.slice(main.indexOf('{!isPartner && ('), main.indexOf('</>\n      )}'));
    expect(ownerBlock).toContain('name="LogTab"');
  });

  it('titles every Health route in Persian', () => {
    for (const r of STACK_ROUTES) { expect(read(path.join(SRC, 'i18n', 'strings.fa.ts'))).toContain(`${r}:`); }
  });
});
