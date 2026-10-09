/**
 * Check-in value loop (mobile): what was recorded today is shown back in plain
 * words, only when recorded; the yesterday comparison is worded from the
 * backend's structured fact; services send the device-local date.
 */
import { buildTodayRecorded, continuityLine } from '../screens/home/todayRecorded';
import { visibleActions, hasRecordedToday } from '../screens/home/visibleActions';
import { phaseDescription } from '../i18n';
import { checkInAcknowledgement, checkInHomeHint } from '../screens/wellness/checkinAcknowledgement';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('buildTodayRecorded', () => {
  it('shows nothing when nothing was recorded', () => {
    expect(buildTodayRecorded({}, [])).toEqual([]);
    expect(buildTodayRecorded(undefined, undefined)).toEqual([]);
    expect(buildTodayRecorded(null, null)).toEqual([]);
  });

  it('shows only the dimensions that are present, in a fixed order', () => {
    const items = buildTodayRecorded({ energy: 6, mood: 4 }, []);
    expect(items.map((i) => i.key)).toEqual(['mood', 'energy']);
    expect(items[0]).toEqual({ key: 'mood', label: 'حال‌وهوا', value: 'خوب' });
    expect(items[1]).toEqual({ key: 'energy', label: 'انرژی', value: 'متوسط' });
  });

  it('words every option the check-in itself can store', () => {
    const moods = [1, 2, 3, 4, 5].map((v) => buildTodayRecorded({ mood: v }, [])[0].value);
    expect(moods).toEqual(['سنگین', 'کمی بد', 'معمولی', 'خوب', 'عالی']);
    const energy = [2, 4, 6, 8, 10].map((v) => buildTodayRecorded({ energy: v }, [])[0].value);
    expect(energy).toEqual(['بی‌حال', 'کم', 'متوسط', 'خوب', 'پرانرژی']);
    const pain = [0, 3, 5, 8, 10].map((v) => buildTodayRecorded({ pain: v }, [])[0].value);
    expect(pain).toEqual(['بدون درد', 'کم', 'متوسط', 'زیاد', 'خیلی زیاد']);
    const stress = [2, 4, 6, 8, 10].map((v) => buildTodayRecorded({ stress: v }, [])[0].value);
    expect(stress).toEqual(['خیلی کم', 'کم', 'متوسط', 'زیاد', 'خیلی زیاد']);
  });

  it('shows sleep as hours without judging it, and symptoms as a count', () => {
    expect(buildTodayRecorded({ sleep: 7 }, [])[0].value).toBe('۷ ساعت');
    expect(buildTodayRecorded({ sleep: 6.5 }, [])[0].value).toBe('۶٫۵ ساعت');
    expect(buildTodayRecorded({}, ['cramps', 'headache'])[0]).toEqual({ key: 'symptoms', label: 'علائم', value: '۲ مورد' });
    expect(JSON.stringify(buildTodayRecorded({ sleep: 3 }, []))).not.toMatch(/خوب|بد/);
  });

  it('ignores out-of-range or non-numeric values instead of inventing a word', () => {
    expect(buildTodayRecorded({ mood: 9, energy: 42, sleep: 0, pain: -1 } as any, [])).toEqual([]);
    expect(buildTodayRecorded({ energy: NaN } as any, [])).toEqual([]);
  });
});

describe('continuityLine', () => {
  it('words each supported signal in both directions', () => {
    for (const signal of ['mood', 'energy', 'pain', 'sleep', 'stress'] as const) {
      const up = continuityLine({ signal, direction: 'up' });
      const down = continuityLine({ signal, direction: 'down' });
      expect(up).toMatch(/نسبت به دیروز/);
      expect(down).toMatch(/نسبت به دیروز/);
      expect(up).not.toEqual(down);
    }
    expect(continuityLine({ signal: 'energy', direction: 'up' })).toBe('انرژی‌ات امروز نسبت به دیروز بالاتره.');
    expect(continuityLine({ signal: 'pain', direction: 'down' })).toBe('دردت امروز نسبت به دیروز کمتره.');
  });

  it('says nothing without a backend fact, and never makes a medical claim', () => {
    expect(continuityLine(null)).toBeNull();
    expect(continuityLine(undefined)).toBeNull();
    expect(continuityLine({ signal: 'unknown' as any, direction: 'up' })).toBeNull();
    const all = ['mood', 'energy', 'pain', 'sleep', 'stress']
      .flatMap((s) => [continuityLine({ signal: s as any, direction: 'up' }), continuityLine({ signal: s as any, direction: 'down' })])
      .join(' ');
    expect(all).not.toMatch(/معمول|طبیعی|بیماری|تشخیص|نگران/);
  });
});

describe('wiring', () => {
  it('Home renders the card from the backend payload and it hides itself when empty', () => {
    const home = read('screens/home/HomeScreen.tsx');
    expect(home).toMatch(/<TodayRecordedCard[^>]*values=\{state\?\.today_values\}/);
    expect(home).toMatch(/continuity=\{today\?\.continuity\}/);
    expect(read('screens/home/components/TodayRecordedCard.tsx')).toMatch(/items\.length === 0\) \{ return null; \}/);
  });

  it('every check-in related request sends the device-local date', () => {
    expect(read('api/services/checkinSessionService.ts')).toMatch(/params: \{ date: todayISO\(\) \}/);
    expect(read('api/services/checkinSessionService.ts')).toMatch(/date: params\.date \?\? todayISO\(\)/);
    expect(read('api/services/intelligenceService.ts')).toMatch(/INTELLIGENCE_TODAY, \{ params: \{ date: todayISO\(\) \} \}/);
    expect(read('api/services/todayFeedbackService.ts')).toMatch(/\{ date: todayISO\(\) \}/);
  });

  it('the first question tells the user where the answers go (and it is true: Home shows them)', () => {
    const screen = read('screens/wellness/AdaptiveCheckInScreen.tsx');
    expect(screen).toMatch(/question_number === 1/);
    expect(screen).toMatch(/جواب‌هات توی صفحهٔ خانه نشون داده می‌شه/);
  });

  it('the push toggle is labelled for what it controls', () => {
    expect(read('screens/profile/SettingsScreen.tsx')).toMatch(/label="یادآوری چک‌این روزانه"\s+prefKey="push_wellness_reminder"/);
  });

  it('copy stays free of emoji', () => {
    for (const f of ['screens/home/todayRecorded.ts', 'screens/home/components/TodayRecordedCard.tsx', 'screens/wellness/checkinAcknowledgement.ts']) {
      expect(read(f)).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
  });
});

describe('hardening pass', () => {
  it('Home shows the recorded row directly under the hero, before the quick-log row and the check-in card', () => {
    const home = read('screens/home/HomeScreen.tsx');
    const card = home.indexOf('<TodayRecordedCard');
    expect(card).toBeGreaterThan(home.indexOf('<HeroRingCard'));
    expect(card).toBeLessThan(home.indexOf('<QuickCheckInWidget'));
    expect(card).toBeLessThan(home.indexOf('<DailyCheckInCard'));
  });

  it('completion points at Home only when something was recorded', () => {
    expect(checkInHomeHint({ recorded: ['mood'], has_log_today: true })).toBe('توی صفحهٔ خانه می‌بینیش.');
    expect(checkInHomeHint({ recorded: [], has_log_today: false })).toBeNull();
    expect(checkInHomeHint(undefined)).toBeNull();
  });

  it('feedback has a deterministic fallback (no error, no fake insight) when AI gives nothing', () => {
    const block = read('components/TodayFeedbackBlock.tsx');
    expect(block).toMatch(/feedbackAvailable === false \|\| feedbackFailed/);
    expect(block).toMatch(/ثبت‌های امروزت ذخیره شد/);
    // ...but that header only shows when something recorded is displayed beneath it
    expect(block).toMatch(/buildTodayRecorded\(today\?\.state\?\.today_values, today\?\.state\?\.today_symptoms\)\.length > 0/);
    expect(block).toMatch(/buildTodayRecorded\(today\?\.state\?\.today_values, today\?\.state\?\.today_symptoms\)\.length > 0/);
    expect(block).toMatch(/<TodayRecordedCard/);
    expect(block).not.toMatch(/نتوانستم|هنوز دارم یاد می‌گیرم/);
  });
});

describe('stale "log today" action', () => {
  const act = (intervention: string, slot = 'primary') => ({ id: 1, slot, intervention } as any);
  it('is hidden once anything is recorded today, and nothing else is touched', () => {
    const actions = [act('log_today'), act('check_in', 'reflection'), act('walk', 'support')];
    expect(visibleActions(actions, { today_values: { mood: 4 }, today_symptoms: [] }).map((a: any) => a.intervention))
      .toEqual(['check_in', 'walk']);
    expect(visibleActions(actions, { today_values: {}, today_symptoms: ['cramps'] }).map((a: any) => a.intervention))
      .toEqual(['check_in', 'walk']);
  });
  it('stays when nothing is recorded yet', () => {
    const actions = [act('log_today')];
    expect(visibleActions(actions, { today_values: {}, today_symptoms: [] })).toHaveLength(1);
    expect(visibleActions(actions, null)).toHaveLength(1);
    expect(visibleActions(undefined, null)).toEqual([]);
    expect(hasRecordedToday(undefined)).toBe(false);
  });
  it('Home applies it', () => {
    expect(read('screens/home/HomeScreen.tsx')).toMatch(/visibleActions\(today\?\.actions, today\?\.state\)/);
  });
});

describe('free-text step', () => {
  it('the input placeholder no longer repeats an older, different question', () => {
    const screen = read('screens/wellness/AdaptiveCheckInScreen.tsx');
    expect(screen).not.toMatch(/placeholder="چیز دیگه‌ای هست که دوست داری ثبت کنی؟"/);
    expect(screen).toMatch(/placeholder="اینجا بنویس\.\.\."/);
  });
});

describe('one vocabulary', () => {
  it('the completion sentence, Home row and question all say «علائم» for symptoms', () => {
    expect(checkInAcknowledgement({ recorded: ['mood', 'symptoms'], has_log_today: true })).toBe('حال‌وهوا و علائم ثبت شد.');
    expect(buildTodayRecorded({}, ['cramps'])[0].label).toBe('علائم');
  });
});

describe('tone: owner-facing copy makes no assumptions about other people', () => {
  const OWNER_FILES = [
    'screens/home/todayRecorded.ts',
    'screens/home/components/TodayRecordedCard.tsx',
    'screens/wellness/checkinAcknowledgement.ts',
    'screens/wellness/AdaptiveCheckInScreen.tsx',
    'components/TodayFeedbackBlock.tsx',
  ];
  const THIRD_PERSON = /بهش|بهشون|کنارش|کنارت|فضا بده|صحبت کن|حرف بزن|پارتنر|همسر|شوهر|عزیزم|می‌فهمم|نگران نباش|سخت نگیر/;
  it('has no third-person, relationship or empathy-filler wording', () => {
    for (const f of OWNER_FILES) {
      expect({ file: f, hit: (read(f).match(THIRD_PERSON) ?? [null])[0] }).toEqual({ file: f, hit: null });
    }
  });

  it('renders the backend deterministic fallback (observations + optional suggestion), never an error', () => {
    const block = read('components/TodayFeedbackBlock.tsx');
    expect(block).toMatch(/feedbackFallback\?\.observations/);
    expect(block).toMatch(/feedbackFallback\.suggestion/);
    expect(read('hooks/queries/useTodayFeedback.ts')).toMatch(/fallback: mutation\.data && !mutation\.data\.available/);
    expect(read('types/todayFeedback.types.ts')).toMatch(/interface TodayFeedbackFallback/);
  });
});

describe('tone: the cycle line on Home states a fact, it does not narrate her body', () => {
  it('has no body-personifying or "getting ready" wording for any phase', () => {
    for (const phase of ['menstrual', 'follicular', 'ovulation', 'luteal', 'expected', 'late', 'overdue', 'unknown']) {
      const text = phaseDescription(phase, 5, 3);
      expect(text).not.toMatch(/بدنت|آماده‌شدن|آماده شدن|در حال آماده/);
    }
    expect(phaseDescription('follicular', 5, 3)).toBe('نیمه اول چرخه، بعد از پایان دوره.');
  });
});

describe('owner narratives may carry no advice', () => {
  it.each([
    'screens/home/components/DailyReflectionCard.tsx',
    'screens/insights/components/WeeklyReviewCard.tsx',
    'screens/insights/components/CycleChangeCard.tsx',
    'components/TodayFeedbackBlock.tsx',
  ])('%s renders the suggestion only when there is one', (file) => {
    expect(read(file)).toMatch(/\.suggestion\s*\?/);
  });
});
