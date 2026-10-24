/**
 * Reproductive goal (optional, owner-only, user-chosen): state logic, error
 * classification, copy safety and the privacy / wiring contracts.
 */
import {
  GOAL_AVOID_NOTE_FA,
  GOAL_ERROR_FA,
  GOAL_ESTIMATE_NOTE_FA,
  GOAL_INTRO_FA,
  GOAL_NO_CHANGE_FA,
  GOAL_OPTIONS,
  GOAL_TTC_NOTE_FA,
  GOAL_VALUES,
  classifyGoalError,
  goalLabel,
  goalNoteFor,
  goalState,
  parseGoal,
} from '../screens/profile/reproductiveGoalLogic';

export {};
declare const __dirname: string;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
const read = (...p: string[]): string => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');

const choices = ['track_cycle', 'trying_to_conceive', 'avoid_pregnancy', 'unsure'];

describe('goal options', () => {
  it('are exactly the four values the backend accepts, each with a label', () => {
    expect([...GOAL_VALUES].sort()).toEqual([...choices].sort());
    for (const o of GOAL_OPTIONS) {
      expect(o.label.length).toBeGreaterThan(0);
    }
    expect(new Set(GOAL_OPTIONS.map((o) => o.label)).size).toBe(4);
  });
});

describe('unset vs chosen vs prefer-not-to-say', () => {
  it('null goal is unset (existing users who never chose)', () => {
    expect(goalState({ goal: null, choices: [] } as never)).toBe('unset');
    expect(goalState(undefined)).toBe('unset');
    expect(goalLabel(null)).toBe('انتخاب نشده');
  });
  it('"unsure" is an explicit answer, distinct from unset and from a real goal', () => {
    expect(goalState({ goal: 'unsure', choices: [] } as never)).toBe('declined');
    expect(goalState({ goal: 'track_cycle', choices: [] } as never)).toBe('chosen');
    expect(goalLabel('unsure')).not.toBe(goalLabel(null));
  });
  it('parseGoal never invents a value from junk', () => {
    expect(parseGoal('avoid_pregnancy')).toBe('avoid_pregnancy');
    for (const bad of ['', 'pregnant', null, undefined, 5, ['track_cycle']]) {
      expect(parseGoal(bad)).toBeNull();
    }
  });
});

describe('error classification', () => {
  const http = (status: number) => ({ response: { status } });
  it('403 is "unsupported account", not a retryable failure', () => {
    expect(classifyGoalError(http(403))).toBe('unsupported');
  });
  it('429 / 400 / 401 / 5xx / offline map to their own buckets', () => {
    expect(classifyGoalError(http(429))).toBe('rate_limited');
    expect(classifyGoalError(http(400))).toBe('validation');
    expect(classifyGoalError(http(401))).toBe('unauthorized');
    expect(classifyGoalError(http(500))).toBe('server');
    expect(classifyGoalError({ message: 'Network Error' })).toBe('offline');
    expect(classifyGoalError(undefined)).toBe('server');
  });
  it('every bucket has Persian copy', () => {
    for (const k of Object.keys(GOAL_ERROR_FA)) {
      expect(GOAL_ERROR_FA[k as keyof typeof GOAL_ERROR_FA]).toMatch(/[؀-ۿ]/);
    }
  });
});

describe('copy safety (not clinically reviewed; guards the claims we must not make)', () => {
  it('avoid-pregnancy note says the calendar is NOT contraception and names no safe day', () => {
    expect(GOAL_AVOID_NOTE_FA).toMatch(/روش پیشگیری از بارداری نیست/);
    expect(GOAL_AVOID_NOTE_FA).toMatch(/روز «امن» مشخص نمی‌کند/);
    expect(goalNoteFor('avoid_pregnancy')).toBe(GOAL_AVOID_NOTE_FA);
  });
  it('TTC note calls the window an estimate, promises nothing, and does not start TTC mode', () => {
    expect(GOAL_TTC_NOTE_FA).toMatch(/تخمین/);
    expect(GOAL_TTC_NOTE_FA).toMatch(/تضمین نمی‌کند/);
    expect(GOAL_TTC_NOTE_FA).toMatch(/روشن نمی‌کند/);
    expect(goalNoteFor('trying_to_conceive')).toBe(GOAL_TTC_NOTE_FA);
  });
  it('estimate note separates the fertile window from confirmed ovulation', () => {
    expect(GOAL_ESTIMATE_NOTE_FA).toMatch(/تخمک‌گذاری تأییدشده نیست/);
  });
  it('says nothing changes and the partner cannot see it', () => {
    expect(GOAL_NO_CHANGE_FA).toMatch(/عوض نمی‌کند/);
    expect(GOAL_NO_CHANGE_FA).toMatch(/شریکت/);
    expect(GOAL_INTRO_FA).toMatch(/اختیاری/);
  });
  it('no note for the neutral choices, and no medical or product claims anywhere', () => {
    expect(goalNoteFor('track_cycle')).toBeNull();
    expect(goalNoteFor('unsure')).toBeNull();
    expect(goalNoteFor(null)).toBeNull();
    const all = [GOAL_AVOID_NOTE_FA, GOAL_TTC_NOTE_FA, GOAL_ESTIMATE_NOTE_FA, GOAL_NO_CHANGE_FA, GOAL_INTRO_FA,
      ...GOAL_OPTIONS.map((o) => o.hint)].join(' ');
    for (const banned of ['قرص', 'داروی', 'اورژانسی', 'ضدبارداری', 'روزهای امن', 'تضمین می‌شود', 'مطمئن باردار']) {
      expect(all).not.toContain(banned);
    }
  });
});

describe('privacy / wiring contracts', () => {
  const hook = read('hooks', 'queries', 'useReproductiveGoal.ts');
  const screen = read('screens', 'profile', 'ReproductiveGoalScreen.tsx');

  it('uses a dedicated query key and endpoint, never the profile cache', () => {
    expect(hook).toMatch(/queryKeys\.reproductiveGoal\.all\(\)/);
    expect(hook).not.toMatch(/queryKeys\.profile/);
    expect(read('api', 'queryKeys.ts')).toMatch(/reproductiveGoal: \{/);
    expect(read('constants', 'config.ts')).toMatch(/REPRODUCTIVE_GOAL: '\/api\/user\/reproductive-goal\/'/);
  });

  it('profile payload/types/hook never mention the goal', () => {
    expect(read('hooks', 'queries', 'useProfile.ts')).not.toMatch(/reproductive/i);
    expect(read('types', 'api.types.ts') + read('api', 'services', 'profileService.ts')).not.toMatch(/reproductive_goal/);
  });

  it('writes only the SERVER response into the cache (no optimistic value)', () => {
    expect(hook).toMatch(/setQueryData\(queryKeys\.reproductiveGoal\.all\(\), payload\)/);
    expect(hook).not.toMatch(/onMutate/);
  });

  it('is disabled for partner accounts and does not retry a 403', () => {
    expect(hook).toMatch(/enabled: isAuthenticated && isResolved && !isPartner/);
    expect(hook).toMatch(/!== 403/);
  });

  it('logout clears every query cache, which drops the goal', () => {
    expect(read('api', 'queryClient.ts')).toMatch(/queryClient\.clear\(\)/);
  });

  it('events fire after confirmation, once, with no properties', () => {
    expect(screen.match(/track\('goal_set'\)/g)).toHaveLength(1);
    expect(screen.match(/track\('goal_removed'\)/g)).toHaveLength(1);
    expect(screen.match(/track\('goal_prompt_viewed'\)/g)).toHaveLength(1);
    expect(screen.indexOf("track('goal_set')")).toBeGreaterThan(screen.indexOf('await setGoal.mutateAsync'));
    expect(screen.indexOf("track('goal_removed')")).toBeGreaterThan(screen.indexOf('await removeGoal.mutateAsync'));
    // one "viewed" per mount, guarded against refetch / rerender
    expect(screen).toMatch(/viewed\.current/);
    expect(screen).not.toMatch(/track\('goal_[a-z_]+',/);
  });

  it('never logs, and ignores a tap while a save is in flight or on the saved value', () => {
    expect(screen).not.toMatch(/console\./);
    expect(screen).toMatch(/if \(busy \|\| goal === saved\) \{ return; \}/);
  });

  it('is reachable only from Profile (owner rows), never auto-opened or part of onboarding', () => {
    const profile = read('screens', 'profile', 'ProfileScreen.tsx');
    const goalRow = profile.slice(profile.indexOf("label=\"هدف من\""));
    expect(profile.lastIndexOf('{isCycleOwner && (', profile.indexOf("label=\"هدف من\"")))
      .toBeGreaterThan(profile.indexOf('تاریخچه سلامت') - 400);
    expect(goalRow).toMatch(/navigate\('ReproductiveGoal'\)/);
    for (const f of [['App.tsx'], ['navigation', 'RootNavigator.tsx'], ['screens', 'onboarding']]) {
      const p = path.join(__dirname, '..', ...f);
      if (!fs.existsSync(p)) { continue; }
      const files: string[] = fs.statSync(p).isDirectory()
        ? fs.readdirSync(p).map((n: string) => path.join(p, n))
        : [p];
      for (const file of files) {
        if (fs.statSync(file).isFile()) {
          expect(fs.readFileSync(file, 'utf8')).not.toMatch(/ReproductiveGoal/);
        }
      }
    }
  });

  it('analytics types: the five new events exist and carry no properties', () => {
    const types = read('analytics', 'types.ts');
    for (const n of ['goal_prompt_viewed', 'goal_set', 'goal_removed', 'feedback_opened', 'feedback_submitted']) {
      expect(types).toMatch(new RegExp(`\\| '${n}'`));
      expect(types).toMatch(new RegExp(`${n}: Record<string, never>;`));
    }
  });

  it('partner / AI paths never reference the goal', () => {
    for (const f of [
      ['screens', 'home', 'partnerGuideContent.ts'],
      ['screens', 'home', 'supportActions.ts'],
      ['hooks', 'queries', 'usePartnerReflection.ts'],
      ['hooks', 'queries', 'useAskRithmo.ts'],
    ]) {
      expect(read(...f)).not.toMatch(/reproductive/i);
    }
  });
});
