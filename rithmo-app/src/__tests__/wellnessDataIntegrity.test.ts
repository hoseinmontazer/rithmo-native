/**
 * QuickLog / LogWellness data integrity.
 *
 * A. One date: QuickLog reads and writes the same local calendar day.
 * B. Exact values: a stored value the pickers cannot represent survives any
 *    save that did not change it; untouched defaults are never reported.
 * C. LogWellness sends only edited fields, on create and on edit (PATCH).
 * D. Repeated saves never duplicate a context entry, while two separate
 *    check-ins with the same tag remain possible.
 * E. Post-save UI resets on reopen; an unsaved draft survives navigation.
 *
 * The rules are pure functions (wellnessEdits.ts) tested directly; the
 * screen wiring is checked by source contract, as elsewhere in this suite
 * (components are verified on device, not in Jest).
 */
declare const __dirname: string;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

import {
  EMPTY_QUICK_BASELINE,
  QUICK_DEFAULTS,
  buildLogWellnessPayload,
  buildQuickLogPayload,
  canSaveWellness,
  changedFields,
  contextEntriesFor,
  contextEntryKey,
  dayLoadState,
  pendingContextEntries,
  quickLogDayState,
  quickDisplayValue,
  quickLogBaseline,
  reportedMetricCount,
  sameSymptoms,
  shouldResetQuickLog,
  type QuickLogDraft,
  type WellnessForm,
} from '../screens/wellness/wellnessEdits';
import { formatDateISO } from '../utils/dateUtils';
import type { WellnessLog } from '../types/wellness.types';
import { QueryClient, QueryObserver, type QueryObserverResult } from '@tanstack/react-query';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]): string => fs.readFileSync(path.join(SRC, ...p), 'utf8');
const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const DAY = '2026-03-10';

function log(overrides: Partial<WellnessLog> = {}): WellnessLog {
  return {
    id: 1, date: DAY, stress_level: 0, sleep_hours: 0, mood_level: 0, energy_level: 5,
    pain_level: 0, exercise_minutes: 0, nutrition_quality: 3, caffeine_intake: 0,
    alcohol_intake: 0, smoking: 0, anxiety_level: 0, focus_level: 0, notes: '',
    symptom_codes: [], reported_fields: [],
    ...overrides,
  };
}

function draft(overrides: Partial<QuickLogDraft> = {}): QuickLogDraft {
  return {
    date: DAY,
    values: { ...QUICK_DEFAULTS },
    touched: { mood: false, energy: false, pain: false, sleep: false },
    symptoms: [],
    notes: '',
    ...overrides,
  };
}

// ── A. One correct date ────────────────────────────────────────────────────

describe('A. QuickLog reads and writes one local calendar day', () => {
  // The process time zone cannot be switched inside Jest, so the boundary is
  // pinned two ways: the formatter reads local calendar fields only, and the
  // last/first minute of a local day map to that day whatever the zone.
  it('the form day is the device-local calendar day, at both edges of the day', () => {
    expect(formatDateISO(new Date(2026, 2, 10, 23, 59, 59))).toBe('2026-03-10');
    expect(formatDateISO(new Date(2026, 2, 11, 0, 0, 0))).toBe('2026-03-11');
    const fmt = read('utils', 'dateUtils.ts');
    const body = fmt.slice(fmt.indexOf('export function formatDateISO'), fmt.indexOf('}', fmt.indexOf('export function formatDateISO')));
    expect(body).toMatch(/getFullYear\(\)[^]*getMonth\(\)[^]*getDate\(\)/);
    expect(body).not.toMatch(/getUTC|toISOString/);
  });

  it('every save carries the day the form was loaded for', () => {
    expect(buildQuickLogPayload(draft({ date: '2026-03-11' }), EMPTY_QUICK_BASELINE))
      .toEqual({ date: '2026-03-11' });
  });

  const quick = stripComments(read('screens', 'wellness', 'QuickLogScreen.tsx'));

  it('the read is for formDate, and the prefill rejects a log for any other day', () => {
    expect(quick).toMatch(/const \[formDate, setFormDate\] = useState\(todayISO\)/);
    expect(quick).toMatch(/useTodayWellnessLog\(formDate\)/);
    expect(quick).toMatch(/todayLog && todayLog\.date === formDate \? todayLog : null/);
    // no fallback that could prefill a "today" form from another log
    expect(quick).not.toMatch(/todayLog \?\? existing/);
  });

  it('the save and its context entries use the same day as the read', () => {
    expect(quick).toMatch(/const saveDate[^=]*= logId \? existing\?\.date : formDate/);
    expect(quick).toMatch(/date: saveDate,/);
    expect(quick).toMatch(/contextEntriesFor<ContextTag>\(saveDate,/);
    expect(quick).not.toMatch(/date: today,/);
  });

  it('the service passes the day to /today/ and to create; old no-arg callers are unchanged', () => {
    const svc = read('api', 'services', 'wellnessService.ts');
    expect(svc).toMatch(/getTodayLog: \(date\?: string\) =>/);
    expect(svc).toMatch(/\.get\(API_ENDPOINTS\.WELLNESS_TODAY, date \? \{ params: \{ date \} \} : undefined\)/);
    expect(svc).toMatch(/date: data\.date \?\? formatDateISO\(new Date\(\)\)/);
  });

  it('the cache key includes the day and still sits under wellness.today() for invalidation', () => {
    const hook = read('hooks', 'queries', 'useWellness.ts');
    expect(hook).toMatch(/queryKey: date \? \[\.\.\.queryKeys\.wellness\.today\(\), date\] : queryKeys\.wellness\.today\(\)/);
    expect(hook).toMatch(/wellnessService\.getTodayLog\(date\)/);
  });

  it('save is held while the day is (re)loading', () => {
    // Strengthened by the Risk A fix: also requires a confirmed load.
    expect(quick).toMatch(/const dayRefetching = logId \? existingFetching : todayFetching;/);
    expect(quick).toMatch(/refetching: dayRefetching \}\) \|\| !saveDate\}/);
  });
});

// ── B. Exact values ────────────────────────────────────────────────────────

describe('B. QuickLog preserves stored values it cannot represent', () => {
  const reported = log({
    mood_level: 4, energy_level: 7, pain_level: 4, sleep_hours: 6.5,
    reported_fields: ['mood_level', 'energy_level', 'pain_level', 'sleep_hours'],
  });
  const baseline = quickLogBaseline(reported);

  it('shows sleep to the half hour and the nearest energy/pain', () => {
    expect(baseline.metrics).toEqual({ mood: 4, energy: 4, pain: 2, sleep: 6.5 });
    expect(quickDisplayValue('sleep', 6.5)).toBe(6.5);
    expect(quickDisplayValue('sleep', 7.25)).toBe(7.5);
  });

  it('energy 7, pain 4, sleep 6.5: an untouched save sends none of them', () => {
    const values = { mood: 4, energy: 4, pain: 2, sleep: 6.5 };
    const payload = buildQuickLogPayload(draft({ values }), baseline);
    expect(payload).toEqual({ date: DAY });
  });

  it('touching a picker without changing its value still sends nothing for it', () => {
    const values = { mood: 4, energy: 4, pain: 2, sleep: 6.5 };
    const touched = { mood: true, energy: true, pain: true, sleep: true };
    expect(buildQuickLogPayload(draft({ values, touched }), baseline)).toEqual({ date: DAY });
  });

  it('changing one picker sends only that one, converted to the stored scale', () => {
    const values = { mood: 4, energy: 3, pain: 2, sleep: 6.5 };
    const touched = { mood: false, energy: true, pain: false, sleep: false };
    expect(buildQuickLogPayload(draft({ values, touched }), baseline))
      .toEqual({ date: DAY, energy_level: 6 });
  });

  it('a half-hour sleep change is saved exactly', () => {
    const values = { mood: 4, energy: 4, pain: 2, sleep: 7.5 };
    const touched = { mood: false, energy: false, pain: false, sleep: true };
    expect(buildQuickLogPayload(draft({ values, touched }), baseline))
      .toEqual({ date: DAY, sleep_hours: 7.5 });
  });

  it('untouched defaults are never reported on a day with no record', () => {
    expect(buildQuickLogPayload(draft(), EMPTY_QUICK_BASELINE)).toEqual({ date: DAY });
  });

  it('on a day with no record, choosing the starting value is a real report', () => {
    const touched = { mood: true, energy: false, pain: false, sleep: false };
    const payload = buildQuickLogPayload(draft({ touched }), EMPTY_QUICK_BASELINE);
    expect(payload).toEqual({ date: DAY, mood_level: QUICK_DEFAULTS.mood });
    expect(reportedMetricCount(payload)).toBe(1);
  });

  it('a stored value that was never reported is not a baseline (the model default is not data)', () => {
    const b = quickLogBaseline(log({ energy_level: 5, reported_fields: ['mood_level'], mood_level: 2 }));
    expect(b.metrics).toEqual({ mood: 2 });
  });

  it('legacy rows with no provenance are treated as reported, so they are preserved', () => {
    const b = quickLogBaseline(log({ energy_level: 7, reported_fields: null }));
    expect(b.metrics.energy).toBe(4);
  });

  it('symptoms and notes are sent only when they differ from what was stored', () => {
    const b = quickLogBaseline(log({ symptom_codes: ['cramps', 'headache'], notes: 'tired' }));
    expect(buildQuickLogPayload(draft({ symptoms: ['headache', 'cramps'], notes: 'tired' }), b))
      .toEqual({ date: DAY });
    expect(buildQuickLogPayload(draft({ symptoms: ['cramps'], notes: 'tired' }), b))
      .toEqual({ date: DAY, symptoms: 'cramps' });
    expect(buildQuickLogPayload(draft({ symptoms: ['cramps', 'headache'], notes: '' }), b))
      .toEqual({ date: DAY, notes: '' });
  });

  it('sameSymptoms is order-insensitive', () => {
    expect(sameSymptoms(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(sameSymptoms(['a'], ['a', 'b'])).toBe(false);
  });

  const quick = stripComments(read('screens', 'wellness', 'QuickLogScreen.tsx'));

  it('the screen no longer marks reported fields touched or rounds sleep to whole hours', () => {
    expect(quick).not.toMatch(/reported\.includes\('(mood_level|energy_level|pain_level|sleep_hours)'\)/);
    expect(quick).not.toMatch(/setTouched\(\{\s*mood: reported/);
    expect(quick).not.toMatch(/Math\.round\(prefillSource\.sleep_hours/);
    expect(quick).toMatch(/buildQuickLogPayload\(/);
  });

  it('a late or refetched prefill never overwrites what the user already edited', () => {
    expect(quick).toMatch(/if \(edited\[metric\]\) \{ return; \}/);
    expect(quick).toMatch(/if \(!edited\.notes\)/);
    expect(quick).toMatch(/if \(!edited\.symptoms\)/);
  });
});

// ── C. LogWellness sends only what was edited ─────────────────────────────

describe('C. LogWellness create and edit send only edited fields', () => {
  const DEFAULT_FORM: WellnessForm = {
    stress_level: 5, sleep_hours: 7, mood_level: 3, energy_level: 5, pain_level: 0,
    exercise_minutes: 0, nutrition_quality: 3, caffeine_intake: 1, alcohol_intake: 0,
    smoking: 0, anxiety_level: 3, focus_level: 5, notes: '',
  };

  it('create: untouched slider defaults are not sent', () => {
    expect(buildLogWellnessPayload(DEFAULT_FORM, new Set(), {}, [], [])).toEqual({});
  });

  it('create: only the edited fields are sent, including an edit to the starting value', () => {
    const form = { ...DEFAULT_FORM, exercise_minutes: 30 };
    expect(buildLogWellnessPayload(form, new Set(['exercise_minutes', 'stress_level'] as const), {}, [], []))
      .toEqual({ exercise_minutes: 30, stress_level: 5 });
  });

  it('edit: a clamped prefill (stored stress 0 shown as 1) is not written back', () => {
    const loaded = { ...DEFAULT_FORM, stress_level: 1, sleep_hours: 6.5, energy_level: 7 };
    const form = { ...loaded, caffeine_intake: 2 };
    expect(buildLogWellnessPayload(form, new Set(['caffeine_intake'] as const), loaded, [], []))
      .toEqual({ caffeine_intake: 2 });
  });

  it('edit: an edited field changed back to its loaded value is not sent', () => {
    expect(buildLogWellnessPayload(DEFAULT_FORM, new Set(['mood_level'] as const), DEFAULT_FORM, [], []))
      .toEqual({});
  });

  it('edit: symptoms only when the selection changed', () => {
    expect(buildLogWellnessPayload(DEFAULT_FORM, new Set(), DEFAULT_FORM, ['a', 'b'], ['b', 'a'])).toEqual({});
    expect(buildLogWellnessPayload(DEFAULT_FORM, new Set(), DEFAULT_FORM, [], ['a'])).toEqual({ symptoms: '' });
  });

  it('changedFields ignores everything not edited', () => {
    expect(changedFields({ a: 1, b: 2 }, new Set<'a' | 'b'>(['b']), { a: 0, b: 0 })).toEqual({ b: 2 });
  });

  const screen = stripComments(read('screens', 'wellness', 'LogWellnessScreen.tsx'));
  const svc = read('api', 'services', 'wellnessService.ts');

  it('the screen builds its payload from edits on both paths, never spreads the full form', () => {
    expect(screen).not.toMatch(/\{ \.\.\.form, symptoms/);
    expect(screen).toMatch(/updateLog\(\{ id: logId, data: payload \}\)/);
    expect(screen).toMatch(/saveLog\(\{ \.\.\.payload, date: createDate \}\)/);
    expect(screen).toMatch(/edited\.current\.add\(key\)/);
  });

  it('an edit is a PATCH, so omitted fields keep their stored values', () => {
    expect(svc).toMatch(/updateLog: \(id: number, data: UpdateWellnessLogRequest\) =>\s*apiClient\s*\.patch\(/);
    expect(svc).not.toMatch(/\.put\(`\$\{API_ENDPOINTS\.WELLNESS\}/);
  });
});

// ── D. Context entries: idempotent saves ──────────────────────────────────

describe('D. repeated saves never duplicate a context entry', () => {
  it('one entry per tag; the note rides on the first; a lone note becomes other', () => {
    expect(contextEntriesFor(DAY, ['travel', 'illness'], '  long flight ', 'other')).toEqual([
      { date: DAY, tag: 'travel', raw_text: 'long flight' },
      { date: DAY, tag: 'illness' },
    ]);
    expect(contextEntriesFor(DAY, [], 'just a note', 'other')).toEqual([
      { date: DAY, tag: 'other', raw_text: 'just a note' },
    ]);
    expect(contextEntriesFor(DAY, [], '   ', 'other')).toEqual([]);
  });

  it('a retry after a partial failure creates only the missing entries, raw_text intact', () => {
    const entries = contextEntriesFor(DAY, ['travel', 'illness'], 'long flight', 'other');
    const created = new Set([contextEntryKey(entries[0])]);
    expect(pendingContextEntries(entries, created)).toEqual([{ date: DAY, tag: 'illness' }]);
  });

  it('a second save of the same selection creates nothing', () => {
    const entries = contextEntriesFor(DAY, ['travel'], 'long flight', 'other');
    const created = new Set(entries.map(contextEntryKey));
    expect(pendingContextEntries(entries, created)).toEqual([]);
  });

  it('distinct tags are still recorded, and the same tag is allowed again in a new session', () => {
    const first = contextEntriesFor(DAY, ['travel'], '', 'other');
    const created = new Set(first.map(contextEntryKey));
    expect(pendingContextEntries(contextEntriesFor(DAY, ['travel', 'illness'], '', 'other'), created))
      .toEqual([{ date: DAY, tag: 'illness' }]);
    // the ledger is per form session: a fresh form starts empty
    expect(pendingContextEntries(first, new Set())).toEqual(first);
  });

  const quick = stripComments(read('screens', 'wellness', 'QuickLogScreen.tsx'));

  it('the screen creates entries sequentially, records successes, and blocks double taps', () => {
    expect(quick).not.toMatch(/Promise\.all\(/);
    expect(quick).toMatch(/for \(const entry of pendingContextEntries\(entries, createdContextKeys\.current\)\)/);
    expect(quick).toMatch(/createdContextKeys\.current\.add\(contextEntryKey\(entry\)\)/);
    expect(quick).toMatch(/if \(submittingRef\.current \|\| !saveDate \|\| !dayReadyRef\.current\) \{ return; \}/);
  });
});

// ── E. Reopen resets; drafts survive navigation ───────────────────────────

describe('E. post-save UI resets on reopen; drafts survive navigation', () => {
  it('resets after a save or a day rollover, and only then', () => {
    expect(shouldResetQuickLog({ saved: true, formDate: DAY, today: DAY })).toBe(true);
    expect(shouldResetQuickLog({ saved: false, formDate: DAY, today: '2026-03-11' })).toBe(true);
    expect(shouldResetQuickLog({ saved: false, formDate: DAY, today: DAY })).toBe(false);
  });

  const quick = stripComments(read('screens', 'wellness', 'QuickLogScreen.tsx'));

  it('checks on focus only (not on every state change), via refs', () => {
    expect(quick).toMatch(/useFocusEffect\(\s*useCallback\(\(\) => \{[^]*?shouldResetQuickLog\(\{ \.\.\.lifecycleRef\.current, today \}\)[^]*?\}, \[resetForm\]\)/);
  });

  it('a reset clears the success view, the draft and the context ledger, and re-prefills', () => {
    const reset = quick.slice(quick.indexOf('const resetForm'), quick.indexOf('const lifecycleRef'));
    for (const expected of [
      /setSaved\(false\)/, /setObservation\(null\)/, /setCelebrationVisible\(false\)/,
      /setSelectedContextTags\(\[\]\)/, /setContextNote\(''\)/, /setNotes\(''\)/,
      /createdContextKeys\.current = new Set\(\)/, /setPrefillKey\(/, /setFormDate\(day\)/,
    ]) {
      expect(reset).toMatch(expected);
    }
    expect(quick).toMatch(/\}, \[prefillSource, prefillKey\]\);/);
  });

  it('a failed save keeps the input and says so', () => {
    expect(quick).toMatch(/اطلاعاتت هنوز اینجاست/);
    const catchBlock = quick.slice(quick.indexOf('} catch (err) {'), quick.indexOf('} finally {'));
    expect(catchBlock).not.toMatch(/resetForm|setNotes|setSelected/);
  });

  it('nothing is persisted to device storage', () => {
    expect(quick).not.toMatch(/AsyncStorage|MMKV|localStorage/);
  });
});

// ── Risk A: no save or replace-style edit over an unknown stored day ──────

/*
 * Drives the real TanStack Query v5 observer (no renderer) with a controllable
 * query function shaped like useTodayWellnessLog's (null = confirmed no log),
 * so the load-state predicate is checked against the library's actual
 * semantics, not against assumptions about them. `retry: false` only shortens
 * the test; retries do not change which state a final failure lands in.
 */
type Outcome = WellnessLog | null | Error;

function dayQuery() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let next: { resolve?: (v: Outcome) => void } = {};
  const observer = new QueryObserver<WellnessLog | null>(client, {
    queryKey: ['wellness', 'today', DAY],
    queryFn: () => new Promise<WellnessLog | null>((resolve, reject) => {
      next.resolve = (v) => (v instanceof Error ? reject(v) : resolve(v));
    }),
  });
  const unsubscribe = observer.subscribe(() => undefined);
  const settle = async (v: Outcome) => {
    await Promise.resolve();
    next.resolve?.(v);
    next = {};
    await new Promise<void>((r) => setTimeout(() => r(), 0));
  };
  const result = (): QueryObserverResult<WellnessLog | null> => observer.getCurrentResult();
  return { observer, result, settle, done: () => { unsubscribe(); client.clear(); } };
}

const stateOf = (r: QueryObserverResult<WellnessLog | null>) =>
  quickLogDayState({ data: r.data, isError: r.isError }, DAY);
const canSave = (r: QueryObserverResult<WellnessLog | null>) =>
  canSaveWellness({ load: stateOf(r), saving: false, refetching: r.isFetching });

describe('Risk A. QuickLog: the stored day must be confirmed before saving', () => {
  const stored = log({ symptom_codes: ['cramps'], notes: 'morning note', reported_fields: [] });

  it('initial request pending: save is blocked', async () => {
    const q = dayQuery();
    expect(stateOf(q.result())).toBe('loading');
    expect(canSave(q.result())).toBe(false);
    q.done();
  });

  it('confirmed empty day (null): save is permitted', async () => {
    const q = dayQuery();
    await q.settle(null);
    expect(stateOf(q.result())).toBe('ready');
    expect(canSave(q.result())).toBe(true);
    q.done();
  });

  it('existing log: ready, and the baseline is the stored record', async () => {
    const q = dayQuery();
    await q.settle(stored);
    expect(stateOf(q.result())).toBe('ready');
    expect(quickLogBaseline(q.result().data)).toMatchObject({ symptoms: ['cramps'], notes: 'morning note' });
    q.done();
  });

  it('initial failure: failed, save blocked; !isFetching alone would have allowed it', async () => {
    const q = dayQuery();
    await q.settle(new Error('offline'));
    const r = q.result();
    expect(r.isFetching).toBe(false);
    expect(r.data).toBeUndefined();
    expect(stateOf(r)).toBe('failed');
    expect(canSave(r)).toBe(false);
    q.done();
  });

  it('retry after failure succeeds: the form becomes ready', async () => {
    const q = dayQuery();
    await q.settle(new Error('offline'));
    const refetch = q.observer.refetch();
    expect(canSave(q.result())).toBe(false);
    await q.settle(stored);
    await refetch;
    expect(stateOf(q.result())).toBe('ready');
    q.done();
  });

  it('background refetch failure keeps the last good log as the baseline', async () => {
    const q = dayQuery();
    await q.settle(stored);
    const refetch = q.observer.refetch();
    expect(canSave(q.result())).toBe(false); // mid-refetch
    await q.settle(new Error('offline'));
    await refetch;
    const r = q.result();
    expect(r.isSuccess).toBe(false); // why isSuccess is the wrong predicate
    expect(r.data).toBe(stored);
    expect(stateOf(r)).toBe('ready');
    expect(canSave(r)).toBe(true);
    expect(quickLogBaseline(r.data).symptoms).toEqual(['cramps']);
    q.done();
  });

  it('a background refetch failure on a confirmed-empty day does not become "unknown"', async () => {
    const q = dayQuery();
    await q.settle(null);
    const refetch = q.observer.refetch();
    await q.settle(new Error('offline'));
    await refetch;
    expect(q.result().data).toBeNull();
    expect(stateOf(q.result())).toBe('ready');
    q.done();
  });

  it('a log for a different day confirms nothing (a server ignoring ?date=)', () => {
    expect(quickLogDayState({ data: log({ date: '2026-03-09' }), isError: false }, DAY)).toBe('failed');
  });

  const quick = stripComments(read('screens', 'wellness', 'QuickLogScreen.tsx'));

  it('the screen derives its state from the predicate and gates Save on it', () => {
    expect(quick).toMatch(/quickLogDayState\(\{ data: todayLog, isError: todayError \}, formDate\)/);
    expect(quick).toMatch(/disabled=\{!canSaveWellness\(\{ load: dayLoad, saving: isPending \|\| submitting, refetching: dayRefetching \}\) \|\| !saveDate\}/);
    expect(quick).toMatch(/if \(submittingRef\.current \|\| !saveDate \|\| !dayReadyRef\.current\) \{ return; \}/);
  });

  it('symptoms and notes cannot be edited until the day is known, so a late response has nothing to discard', () => {
    const toggle = quick.slice(quick.indexOf('const toggleSymptom'), quick.indexOf('const toggleContextTag'));
    expect(toggle).toMatch(/if \(!dayReadyRef\.current\) \{ return; \}[^]*editedRef\.current\.symptoms = true/);
    const notes = quick.slice(quick.indexOf('const onNotesChange'), quick.indexOf('const createdContextKeys'));
    expect(notes).toMatch(/if \(!dayReadyRef\.current\) \{ return; \}[^]*editedRef\.current\.notes = true/);
    expect(quick).toMatch(/onPress=\{\(\) => toggleSymptom\(sym\.code\)\}\s*disabled=\{!dayReady\}/);
    expect(quick).toMatch(/onChangeText=\{onNotesChange\}\s*editable=\{dayReady\}/);
  });

  it('a failed load offers a retry that only refetches, keeping the draft', () => {
    expect(quick).toMatch(/dayLoad === 'failed' && !dayRefetching && \(\s*<ErrorState [^>]*onRetry=\{retryDayLoad\}/);
    const retry = quick.slice(quick.indexOf('const retryDayLoad'), quick.indexOf('const retryDayLoad') + 200);
    expect(retry).toMatch(/refetchExisting\(\)[^]*refetchToday\(\)/);
    expect(retry).not.toMatch(/resetForm|set[A-Z]/);
  });
});

describe('Risk A. LogWellness: no PATCH or upsert over an unconfirmed record', () => {
  const editState = (data: WellnessLog | null | undefined, isError: boolean) =>
    dayLoadState({ data, isError }, { requireRecord: true });

  it('edit record pending: save is blocked', () => {
    expect(editState(undefined, false)).toBe('loading');
    expect(canSaveWellness({ load: 'loading', saving: false, refetching: true })).toBe(false);
  });

  it('edit record failed: save is blocked; a null record is not a baseline either', () => {
    expect(editState(undefined, true)).toBe('failed');
    expect(editState(null, false)).toBe('loading');
    expect(canSaveWellness({ load: 'failed', saving: false, refetching: false })).toBe(false);
  });

  it('retry succeeds: editing can continue', () => {
    expect(editState(log(), true)).toBe('ready'); // data present after a later failed refetch
    expect(canSaveWellness({ load: 'ready', saving: false, refetching: false })).toBe(true);
  });

  it('unchanged fields stay out of the PATCH once loaded', () => {
    const loaded: WellnessForm = {
      stress_level: 1, sleep_hours: 6.5, mood_level: 3, energy_level: 7, pain_level: 4,
      exercise_minutes: 0, nutrition_quality: 3, caffeine_intake: 0, alcohol_intake: 0,
      smoking: 0, anxiety_level: 3, focus_level: 5, notes: 'kept',
    };
    expect(buildLogWellnessPayload({ ...loaded, mood_level: 4 }, new Set(['mood_level'] as const), loaded, ['cramps'], ['cramps']))
      .toEqual({ mood_level: 4 });
  });

  const screen = stripComments(read('screens', 'wellness', 'LogWellnessScreen.tsx'));

  it('Save, symptoms and notes are gated on the confirmed record', () => {
    expect(screen).toMatch(/dayLoadState\(\{ data: editQuery\.data, isError: editQuery\.isError \}, \{ requireRecord: true \}\)/);
    expect(screen).toMatch(/disabled=\{!canSaveWellness\(\{ load: dayLoad, saving: isPending, refetching: dayRefetching \}\)\}/);
    const save = screen.slice(screen.indexOf('const handleSave'), screen.indexOf('const handleSave') + 120);
    expect(save).toMatch(/if \(!dayReadyRef\.current\) \{ return; \}/);
    const toggle = screen.slice(screen.indexOf('const toggleSymptom'), screen.indexOf('const handleSave'));
    expect(toggle).toMatch(/if \(!dayReadyRef\.current\) \{ return; \}/);
    expect(screen).toMatch(/if \(key === 'notes' && !dayReadyRef\.current\) \{ return; \}/);
    expect(screen).toMatch(/onPress=\{\(\) => toggleSymptom\(sym\.code\)\}\s*disabled=\{!dayReady\}/);
    expect(screen).toMatch(/editable=\{dayReady\}/);
    expect(screen).toMatch(/<ErrorState [^>]*onRetry=\{retryLoad\}/);
  });

  it('a late load keeps every field the user already edited', () => {
    expect(screen).toMatch(/edited\.current\.forEach\(\(key\) => \{ \(next as Record<string, unknown>\)\[key\] = prev\[key\]; \}\)/);
    expect(screen).toMatch(/if \(!symptomsEdited\.current\) \{ setSelectedSymptoms\(codes\); \}/);
  });

  it('a new report edits on top of today\'s confirmed log and saves to that same day', () => {
    expect(screen).toMatch(/const \[createDate\] = useState\(todayISO\)/);
    expect(screen).toMatch(/useTodayWellnessLog\(createDate, \{ enabled: !logId \}\)/);
    expect(screen).toMatch(/quickLogDayState\(\{ data: todayQuery\.data, isError: todayQuery\.isError \}, createDate\)/);
    expect(screen).toMatch(/saveLog\(\{ \.\.\.payload, date: createDate \}\)/);
  });
});
