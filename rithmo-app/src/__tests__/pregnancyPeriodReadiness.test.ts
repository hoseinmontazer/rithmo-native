/**
 * Pregnancy + period release-readiness contract.
 *
 * Rendering is verified on a device (see jest.config.js); these pin the
 * behaviours that were wrong and are now fixed, so they cannot quietly
 * regress.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

import { buildCycleDateMap, withoutPredictions } from '@utils/cycleDayMap';
import { OBSERVATION_TODAY_ONLY_NOTE_FA, observationActionFor } from '@utils/periodCalendar';
import { QUICK_SYMPTOMS, SYMPTOMS, quickSymptomsFor } from '@constants/symptoms';

const SRC = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('calendar while pregnant', () => {
  const periods = [
    { id: 1, start_date: '2026-09-01', end_date: '2026-09-05', next_period_start_date: '2026-09-29' },
    { id: 2, start_date: '2026-09-29', end_date: '2026-10-03', next_period_start_date: '2026-10-27' },
  ];

  it('keeps recorded periods and drops every predicted/phase day', () => {
    const full = buildCycleDateMap(periods);
    const kinds = new Set(Array.from(full.values()).map((d) => d.type));
    expect(kinds.size).toBeGreaterThan(1); // control: the unfiltered map has predictions/phases
    const kept = withoutPredictions(full);
    expect(kept.size).toBeGreaterThan(0);
    kept.forEach((info) => expect(info.type).toBe('period'));
    expect(Array.from(kept.keys())).toContain('2026-09-02');
  });

  it('is wired into the calendar screen', () => {
    const src = read('screens/cycle/CycleTrackerScreen.tsx');
    expect(src).toMatch(/withoutPredictions\(/);
    expect(src).toMatch(/usePregnancyStatus/);
  });
});

describe('pregnancy start/end refresh every prediction cache', () => {
  it('uses the shared period-dependents invalidation (includes the intelligence queries)', () => {
    const src = read('hooks/queries/usePregnancy.ts');
    expect(src).toMatch(/invalidatePeriodDependents/);
    const usePeriods = read('hooks/queries/usePeriods.ts');
    expect(usePeriods).toMatch(/queryKeys\.intelligence\.all\(\)/);
  });
});

describe('ending a pregnancy', () => {
  const src = read('screens/pregnancy/PregnancyStatusScreen.tsx');
  const handler = src.slice(src.indexOf('const handleEndPregnancy'), src.indexOf('if (isLoading ||'));

  it('is neutral: no success styling, no assumption about outcome or feeling', () => {
    expect(handler).toMatch(/toast\.info\(/);
    expect(handler).not.toMatch(/toast\.success\(/);
    expect(handler).not.toMatch(/تبریک|خوشحال|متأسف|امیدوار/);
  });

  it('the confirmation is not styled as a warning/alarm', () => {
    const confirm = src.slice(src.indexOf('<ConfirmSheet'), src.indexOf('/>', src.indexOf('<ConfirmSheet')));
    expect(confirm).toMatch(/variant="info"/);
    expect(confirm).not.toMatch(/variant="(warning|danger)"/);
  });

  it('never shows the raw server error', () => {
    expect(handler).toMatch(/extractErrorMessage\(/);
    expect(handler).not.toMatch(/response\?\.data\?\.error/);
  });

  it('start screen also never shows raw server English', () => {
    const setup = read('screens/pregnancy/PregnancySetupScreen.tsx');
    expect(setup).toMatch(/extractErrorMessage\(/);
    expect(setup).not.toMatch(/response\?\.data\?\.error/);
  });
});

describe('logging a period while pregnant', () => {
  const src = read('screens/cycle/LogPeriodScreen.tsx');

  it('stays available (a report is never discarded) with neutral copy', () => {
    expect(src).toMatch(/usePregnancyStatus/);
    expect(src).toMatch(/پیش‌بینی چرخه را دوباره فعال نمی‌کند/);
    // the routine "menstrual period" wording is only the non-pregnant branch
    expect(src).toMatch(/pregnant\s*\n?\s*\?/);
  });
});

describe('bleeding / symptom reports while pregnant', () => {
  it('the calendar day action becomes an observation, routed to Quick Log (never a period start)', () => {
    const src = read('screens/cycle/CycleTrackerScreen.tsx');
    expect(src).toMatch(/pregnant \?[^]*?label="ثبت علامت یا مشاهده‌ی امروز"[^]*?onLogObservation/);
    expect(src).toMatch(/name: 'LogTab', params: \{ screen: 'QuickLog' \}/);
    expect(src).toMatch(/isPregnant \? 'ثبت علامت یا مشاهده' : 'ثبت دوره'/);
    // the non-pregnant wording is unchanged
    expect(src).toMatch(/ثبت شروع دوره از این روز/);
  });

  it('the Period screen primary button follows the same rule', () => {
    const src = read('screens/cycle/CycleAnalysisScreen.tsx');
    expect(src).toMatch(/isPregnant \? 'ثبت علامت یا مشاهده' : 'ثبت دوره'/);
    expect(src).toMatch(/name: 'LogTab', params: \{ screen: 'QuickLog' \}/);
  });

  it('Quick Log offers «لکه‌بینی» only while pregnant (or when today\'s log already holds it)', () => {
    const codes = (list: readonly { code: string }[]) => list.map((s) => s.code);
    expect(codes(quickSymptomsFor(false))).toEqual(codes(QUICK_SYMPTOMS));      // everyday chips unchanged
    expect(codes(quickSymptomsFor(false))).not.toContain('spotting');
    const pregnant = quickSymptomsFor(true);
    expect(codes(pregnant)).toEqual([...codes(QUICK_SYMPTOMS), 'spotting']);
    expect(pregnant[pregnant.length - 1].label).toBe('لکه‌بینی');              // clearly labelled
    expect(codes(quickSymptomsFor(false, ['spotting']))).toContain('spotting'); // can always be unselected
    expect(codes(quickSymptomsFor(true, ['spotting'])).filter((c) => c === 'spotting')).toHaveLength(1);
    // the code is a real member of the server vocabulary, so it goes through the ordinary log path
    expect(SYMPTOMS.some((s) => s.code === 'spotting')).toBe(true);
  });

  it('Quick Log renders the pregnancy-aware chip list and saves through the existing wellness log path', () => {
    const quick = read('screens/wellness/QuickLogScreen.tsx');
    expect(quick).toMatch(/quickSymptomsFor\(Boolean\(pregnancyStatus\?\.has_active_pregnancy\), selectedSymptoms\)/);
    expect(quick).toMatch(/quickSymptoms\.map\(/);
    expect(quick).not.toMatch(/COMMON_SYMPTOMS/);
    // no period endpoint is touched from this screen
    expect(quick).not.toMatch(/useCreatePeriod|createPeriod|LogPeriod/);
    expect(quick).toMatch(/useCreateOrUpdateWellnessLog/);
  });

  it('the calendar legend hides the prediction swatches while pregnant', () => {
    const src = read('screens/cycle/CycleTrackerScreen.tsx');
    expect(src).toMatch(/\{!pregnant && \(\s*<>[^]*?دوره‌ی پیش‌بینی‌شده[^]*?دیرکرد دوره[^]*?بازه‌ی باروری \(تخمینی\)[^]*?<\/>\s*\)\}/);
  });
});

describe('due-date correction', () => {
  it('is a PATCH on the same endpoint, invalidates every dependent cache, and is offered on the status screen', () => {
    expect(read('api/services/pregnancyService.ts')).toMatch(/update:[^]*?apiClient\.patch/);
    const hook = read('hooks/queries/usePregnancy.ts');
    expect(hook).toMatch(/export function useUpdatePregnancy/);
    expect(hook.slice(hook.indexOf('useUpdatePregnancy'))).toMatch(/invalidatePeriodDependents/);
    const status = read('screens/pregnancy/PregnancyStatusScreen.tsx');
    expect(status).toMatch(/setEditingDates\(true\)/);
    expect(status).toMatch(/<PregnancySetupScreen editing/);
    const setup = read('screens/pregnancy/PregnancySetupScreen.tsx');
    expect(setup).toMatch(/editing \? updateMutation : startMutation/);
    expect(setup).toMatch(/toast\.info\('تاریخ بارداری به‌روز شد'/);
  });
});

describe('Quick Log from the calendar while pregnant records today only', () => {
  it('offers the action for today and nothing for any other day', () => {
    expect(observationActionFor('2026-10-23', '2026-10-23')).toBe('today');
    expect(observationActionFor('2026-10-22', '2026-10-23')).toBe('other');
    expect(observationActionFor('2026-10-24', '2026-10-23')).toBe('other');
  });

  it('the panel labels it as today and shows the note (no button) on other days', () => {
    const src = read('screens/cycle/CycleTrackerScreen.tsx');
    expect(src).toMatch(/observationActionFor\(dateStr, todayISO\(\)\) === 'today'/);
    expect(src).toMatch(/OBSERVATION_TODAY_ONLY_NOTE_FA/);
    expect(OBSERVATION_TODAY_ONLY_NOTE_FA).toMatch(/فقط برای امروز/);
    expect(OBSERVATION_TODAY_ONLY_NOTE_FA).not.toMatch(/[A-Za-z]/);
  });

  it('the app always sends the device local date to the wellness endpoint, never a calendar selection', () => {
    const svc = read('api/services/wellnessService.ts');
    // A caller may pin the day it loaded (QuickLog's formDate, itself taken
    // from the device clock); otherwise the device's current local day.
    expect(svc).toMatch(/createOrUpdateLog[^]*?date: data\.date \?\? formatDateISO\(new Date\(\)\)/);
    const quick = read('screens/wellness/QuickLogScreen.tsx');
    expect(quick).not.toMatch(/route\.params\??\.(date|selectedDate)/);
  });
});

describe('Doctor Report cycle_summary prediction confidence', () => {
  it('the contract allows null and the screen never renders the field', () => {
    const types = read('types/doctorReport.types.ts');
    expect(types).toMatch(/confidence_label: 'low' \| 'medium' \| 'high' \| null;/);
    const screen = read('screens/insights/DoctorHealthReportScreen.tsx');
    // cycle summary shows average, recent lengths and regularity only; its prediction confidence is not displayed
    expect(screen).not.toMatch(/cycle\.confidence_label/);
    expect(screen).not.toMatch(/cycle_summary\.confidence_label/);
    const block = screen.slice(screen.indexOf('function CycleSummaryBlock'), screen.indexOf('function SymptomPatternsBlock'));
    expect(block).not.toMatch(/confidence/);
  });
});

describe('TTC screen prediction confidence while pregnant', () => {
  const screen = read('screens/ttc/TTCStatusScreen.tsx');

  it('the contract allows null for the TTC cycle summary confidence', () => {
    expect(read('types/ttc.types.ts')).toMatch(/confidence_label: string \| null;/);
  });

  it('the «اطمینان پیش‌بینی» row renders only when a value exists, so null shows nothing', () => {
    expect(screen).toMatch(/data\.cycle_summary\.confidence_label \? \(/);
    // the label text and the value are only reachable inside that guard
    const guarded = screen.slice(screen.indexOf('data.cycle_summary.confidence_label ? ('));
    expect(guarded.indexOf('اطمینان پیش‌بینی')).toBeGreaterThan(0);
    expect(screen.match(/confidence_label/g)?.length).toBe(2); // the guard and the single use inside it
    expect(screen.match(/اطمینان پیش‌بینی/g)?.length).toBe(1);
  });

  it('the screen never changes the TTC state on its own (no start/pause/end on mount)', () => {
    // actions exist only behind explicit handlers; nothing calls them from an effect
    expect(screen).not.toMatch(/useEffect\([^]*?(startTTC|pauseTTC|endTTC|useTTCAction)/);
  });
});
