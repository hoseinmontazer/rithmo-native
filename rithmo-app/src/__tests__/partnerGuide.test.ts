/**
 * Partner Guide (راهنمای همراهی): content rules, navigation targets and the
 * boundaries that keep it from touching anything private or recorded.
 *
 * Rendering is checked on a device (see jest.config.js); these tests pin what
 * cannot be seen by looking at a screen: what each entry opens, that the
 * content never depends on owner data, and that no tap here creates a record.
 */
import {
  GUIDE_FOOTER_FA,
  GUIDE_INTRO_FA,
  GUIDE_TITLE_FA,
  HELP_AVOID,
  HELP_OPTIONS,
  PARTNER_GUIDE_SECTIONS,
  SECTION_META,
  TALK_GROUPS,
  UNDERSTAND_CARDS,
  allGuideStrings,
  guideSectionTitle,
  isGuideSection,
} from '../screens/home/partnerGuideContent';
import { draftRoute, guideRoute } from '../screens/home/partnerGuideNav';
import { MESSAGE_PREFILL_FA, resolveChatTarget } from '../screens/home/supportActions';

// The project has no Node typings (tsc would flag `import 'fs'`); some checks
// read source text, so reach Node's modules through an untyped require.
declare const require: (id: string) => any;
const fs = require('fs') as { readFileSync(file: string, encoding: string): string };
const path = require('path') as { join(...parts: string[]): string };
const src = (...p: string[]) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// The reviewed partner phase knowledge, copied from the backend
// (intelligence/domain/phase_context.py GENERAL_PHASE_CONTEXT_PARTNER_FA).
// The guide must quote it verbatim; if the backend text changes, update both.
const REVIEWED_PHASE_LINES = [
  'ممکنه این روزها انرژی کمتری نسبت به بقیه‌ی روزهای چرخه‌اش داشته باشه.',
  'بعضی افراد در این روزها گرفتگی یا درد را تجربه می‌کنن.',
  'خلق‌وخوش ممکنه نوسان داشته باشه.',
  'خیلی‌ها در این فاز انرژی بیشتری نسبت به روزهای قاعدگی حس می‌کنن.',
  'خلق‌وخوش برای بعضی افراد در این روزها باثبات‌تره.',
  'بعضی افراد دور روزهای تخمک‌گذاری انرژی بالاتری دارن.',
  'ممکنه علائم بدنی خفیفی مثل درد یک‌طرفه‌ی لگن را تجربه کنه.',
  'بعضی افراد در این بخش از چرخه تغییراتی در انرژی، خواب یا اشتها تجربه می‌کنن.',
  'خلق‌وخوش هم برای بعضی افراد ممکنه نوسان داشته باشه.',
];

describe('three jobs, three entry points', () => {
  it('has exactly understand / talk / help, titled as the product asks', () => {
    expect(PARTNER_GUIDE_SECTIONS).toEqual(['understand', 'talk', 'help']);
    expect(GUIDE_TITLE_FA).toBe('راهنمای همراهی');
    expect(SECTION_META.understand.title).toBe('می‌خوام بهتر بفهمم');
    expect(SECTION_META.talk.title).toBe('نمی‌دونم چی بگم');
    expect(SECTION_META.help.title).toBe('می‌خوام کمک عملی کنم');
    expect(GUIDE_INTRO_FA).toContain('بهتر بفهمی');
  });

  it('each entry opens the matching section (and only that one)', () => {
    for (const section of PARTNER_GUIDE_SECTIONS) {
      expect(guideRoute(section)).toEqual({ name: 'PartnerGuide', params: { section } });
    }
  });

  it('an unknown or missing section falls back safely instead of crashing', () => {
    expect(isGuideSection('talk')).toBe(true);
    expect(isGuideSection('nope')).toBe(false);
    expect(isGuideSection(undefined)).toBe(false);
    expect(guideSectionTitle(undefined)).toBe(GUIDE_TITLE_FA);
    expect(guideSectionTitle('help')).toBe(SECTION_META.help.title);
  });

  it('is a small set, not a library, and every card is short enough for a phone', () => {
    expect(UNDERSTAND_CARDS.length).toBeGreaterThanOrEqual(3);
    expect(UNDERSTAND_CARDS.length).toBeLessThanOrEqual(6);
    expect(TALK_GROUPS.length).toBeGreaterThanOrEqual(4);
    expect(TALK_GROUPS.length).toBeLessThanOrEqual(6);
    expect(HELP_OPTIONS.length).toBeGreaterThanOrEqual(3);
    expect(HELP_OPTIONS.length).toBeLessThanOrEqual(5);
    for (const s of allGuideStrings()) {
      expect(s.trim().length).toBeGreaterThan(0);
      expect(s.length).toBeLessThanOrEqual(330);
    }
    for (const g of TALK_GROUPS) {
      for (const starter of g.starters) { expect(starter.length).toBeLessThanOrEqual(90); }
    }
  });
});

describe('content rules (what the guide must never say)', () => {
  const text = allGuideStrings().join('\n');

  it('never tells the partner an "always right" instruction', () => {
    for (const phrase of ['همیشه کنارش باش', 'بهش فضا بده', 'کنارش باش', 'فقط درکش کن', 'بهش عشق بده']) {
      expect(text).not.toContain(phrase);
    }
  });

  it('has no therapist or motivational register', () => {
    for (const phrase of ['می‌فهمم', 'نگران نباش', 'تو قوی', 'به خودت سخت نگیر', 'این هم می‌گذره', 'ندای بدن']) {
      expect(text).not.toContain(phrase);
    }
  });

  it('does not assume a feeling, a problem or a cause in what the partner is told to say', () => {
    const said = [...TALK_GROUPS.flatMap((g) => g.starters), ...HELP_OPTIONS.map((o) => o.body)].join('\n');
    for (const assumed of ['ناراحت', 'غمگین', 'افسرده', 'عصبانی', 'مضطرب', 'مشکل داری', 'بخاطر پریود', 'به‌خاطر پریود']) {
      expect(said).not.toContain(assumed);
    }
  });

  it('quotes the reviewed phase knowledge verbatim, as general statements about some people', () => {
    const phases = UNDERSTAND_CARDS.find((c) => c.id === 'phases');
    expect(phases?.source).toBe('phase_context');
    const joined = (phases?.points ?? []).join(' ');
    for (const line of REVIEWED_PHASE_LINES) { expect(joined).toContain(line); }
    expect(phases?.body.join(' ')).toContain('چیزی درباره‌ی او نمی‌گویند');
  });

  it('names the phases with the product\'s own labels, not invented ones', () => {
    const points = (UNDERSTAND_CARDS.find((c) => c.id === 'phases')?.points ?? []).map((p) => p.split(':')[0]);
    // intelligence/domain/cycles.py PHASE_LABELS_FA (the same words Partner Home shows)
    expect(points).toEqual(['قاعدگی', 'فولیکولار', 'تخمک‌گذاری', 'لوتئال']);
  });

  it('never asserts how she feels or will feel: only "may" (it is a guide about not assuming)', () => {
    expect(text).not.toMatch(/(?<!ممکن است )حس می‌کند(?! )/);
    expect(text).not.toContain('یعنی امروز همین');
  });

  it('every card that is not reviewed phase text says so (editorial, no medical claim)', () => {
    for (const c of UNDERSTAND_CARDS) { expect(['phase_context', 'editorial']).toContain(c.source); }
    expect(HELP_AVOID.source).toBe('editorial');
  });

  it('keeps medicine to the minimum: points to a doctor, never diagnoses or predicts', () => {
    const pro = UNDERSTAND_CARDS.find((c) => c.id === 'when-professional');
    expect(pro?.body.join(' ')).toContain('جای نظر پزشک را نمی‌گیرد');
    expect((pro?.avoid ?? []).join(' ')).toContain('تشخیص نده');
    expect(GUIDE_FOOTER_FA).toContain('جای نظر پزشک را نمی‌گیرند');
  });

  it('makes every practical offer optional: "no" is always a complete answer', () => {
    for (const o of HELP_OPTIONS) {
      expect(o.ifNo.length).toBeGreaterThan(10);
      // a complete sentence of its own: the screen adds no prefix that could repeat it
      expect(o.ifNo.startsWith('اگر')).toBe(true);
    }
    const space = HELP_OPTIONS.find((o) => o.id === 'her-space');
    // space is her request, never the default instruction
    expect(space?.title).toContain('خودش گفت');
    expect(space?.ifNo).toContain('فرض نکن');
  });
});

describe('conversation starters are drafts, never sent', () => {
  const target = resolveChatTarget([{ partner_user_id: 7, first_name: 'سارا' }]);

  it('opens the existing conversation with an editable draft, like the "message" support action', () => {
    expect(target).toEqual({ partnerId: '7', partnerName: 'سارا' });
    const [tab, params] = draftRoute(target!, TALK_GROUPS[0].starters[0]);
    expect(tab).toBe('ProfileTab');
    expect(params).toEqual({
      screen: 'PartnerMessages',
      params: {
        screen: 'Conversation',
        params: { partnerId: '7', partnerName: 'سارا', prefill: TALK_GROUPS[0].starters[0] },
        initial: false,
      },
    });
  });

  it('shares the route shape of the existing message action (same prefill param)', () => {
    const existing = strip(src('screens', 'home', 'components', 'SupportActionRow.tsx'));
    expect(existing).toContain('prefill: MESSAGE_PREFILL_FA');
    expect(existing).toContain('initial: false');
    expect(MESSAGE_PREFILL_FA.length).toBeGreaterThan(0);
  });

  it('without a linked partner there is nothing to open (the starters stay readable)', () => {
    expect(resolveChatTarget([])).toBeNull();
    expect(resolveChatTarget(undefined)).toBeNull();
  });
});

describe('privacy and relationship boundaries', () => {
  it('the content module imports nothing: it cannot depend on owner data, the server or a model', () => {
    expect(strip(src('screens', 'home', 'partnerGuideContent.ts'))).not.toMatch(/\bimport\s/);
  });

  it('the guide screen reads no owner data and records nothing itself', () => {
    const screen = strip(src('screens', 'home', 'PartnerGuideScreen.tsx'));
    for (const forbidden of [
      'usePartnerToday', 'usePartnerReflection', 'useTodayFeedback', 'useIntelligence',
      'useLogPartnerAction', 'track(', 'apiClient', 'fetch(', 'sendMessage', 'useSendMessage',
    ]) {
      expect(screen).not.toContain(forbidden);
    }
    // The only reuse of the action system is the existing component, unchanged.
    expect(screen).toContain('<SupportActionRow');
    expect(screen).toContain('useProfile'); // only to know whether a conversation can be opened
  });

  it('the entry card is static: no queries, no analytics, no health data', () => {
    const entry = strip(src('screens', 'home', 'components', 'PartnerGuideEntry.tsx'));
    for (const forbidden of ['useQuery', 'usePartnerToday', 'track(', 'apiClient', 'useLogPartnerAction']) {
      expect(entry).not.toContain(forbidden);
    }
  });

  it('the existing support actions are reused, not redefined', () => {
    const screen = strip(src('screens', 'home', 'PartnerGuideScreen.tsx'));
    expect(screen).not.toContain('SUPPORT_ACTIONS');
    expect(screen).not.toContain('record_partner_action');
  });
});

describe('wiring', () => {
  it('Partner Home shows the guide in every state: once, outside the data-dependent body', () => {
    const home = src('screens', 'home', 'PartnerHomeScreen.tsx');
    expect(home.match(/<PartnerGuideEntry \/>/g)?.length).toBe(1);
    // `{body}` (the last occurrence) is where the data-dependent states render.
    expect(home.indexOf('<PartnerGuideEntry />')).toBeLessThan(home.lastIndexOf('{body}'));
  });

  it('the route is registered on the home stack and typed', () => {
    expect(src('navigation', 'stacks', 'HomeStack.tsx')).toContain('name="PartnerGuide"');
    expect(src('navigation', 'types.ts')).toMatch(/PartnerGuide:\s*\{ section: PartnerGuideSection \}/);
  });
});
