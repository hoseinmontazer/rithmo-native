/**
 * Period calendar and correction rules: what a tapped date is, what the edit
 * form may send, and how backend errors read in Persian.
 */
import { buildCycleDateMap } from '@utils/cycleDayMap';
import {
  buildPeriodPatch,
  calendarCellA11yLabel,
  describeCalendarDay,
  describePeriodChange,
  hasPeriodChanges,
  mapPeriodError,
  periodDraftFromRecord,
  pickCurrentPeriod,
  periodLengthDays,
  validatePeriodDraft,
} from '@utils/periodCalendar';

const TODAY = '2026-10-23';

// A recorded period 14-19 Oct, with the backend's prediction for the next one.
const RECORDED = {
  id: 7,
  start_date: '2026-10-14',
  end_date: '2026-10-19',
  next_period_start_date: '2026-11-12',
  period_duration: 6,
  estimated_ovulation_date: '2026-10-29',
  fertile_window: { start: '2026-10-24', end: '2026-10-30' },
};

describe('calendar classification (buildCycleDateMap)', () => {
  const map = buildCycleDateMap([RECORDED]);

  it('marks every logged day as an actual period day, with start and end flags', () => {
    for (const d of ['2026-10-14', '2026-10-16', '2026-10-19']) {
      expect(map.get(d)?.type).toBe('period');
      expect(map.get(d)?.periodId).toBe(7);
    }
    expect(map.get('2026-10-14')?.isStart).toBe(true);
    expect(map.get('2026-10-19')?.isEnd).toBe(true);
  });

  it('marks the predicted next period as predicted, not as actual', () => {
    for (const d of ['2026-11-12', '2026-11-17']) {
      expect(map.get(d)?.type).toBe('predicted_period');
      expect(map.get(d)?.periodId).toBeUndefined();
    }
  });

  it('leaves a day outside any period and prediction unclassified as a period', () => {
    expect(map.get('2026-10-10')).toBeUndefined();
  });

  it('keeps a period that spans a Gregorian and a Jalali month boundary contiguous', () => {
    const m = buildCycleDateMap([{ id: 1, start_date: '2026-10-28', end_date: '2026-11-03' }]);
    for (const d of ['2026-10-28', '2026-10-31', '2026-11-01', '2026-11-03']) {
      expect(m.get(d)?.type).toBe('period');
    }
    expect(m.get('2026-11-04')).toBeUndefined();
  });

  it('moves the period days when the start or end date is corrected', () => {
    const edited = buildCycleDateMap([{ ...RECORDED, start_date: '2026-10-15', end_date: '2026-10-18' }]);
    expect(edited.get('2026-10-14')?.type).not.toBe('period');
    expect(edited.get('2026-10-15')?.type).toBe('period');
    expect(edited.get('2026-10-19')?.type).not.toBe('period');
  });
});

describe('describeCalendarDay', () => {
  const map = buildCycleDateMap([RECORDED]);
  const at = (d: string) => describeCalendarDay(d, TODAY, map.get(d));

  it('recorded period day: editable, not loggable', () => {
    const d = at('2026-10-16');
    expect(d.status).toBe('recorded');
    expect(d.canEditPeriod).toBe(true);
    expect(d.periodId).toBe(7);
    expect(d.canLogFromHere).toBe(false);
  });

  it('first and last recorded days say so', () => {
    expect(at('2026-10-14').detail).toContain('اولین روز');
    expect(at('2026-10-19').detail).toContain('آخرین روز');
  });

  it('future predicted day: labelled as a prediction, cannot be logged or edited', () => {
    const d = at('2026-11-12');
    expect(d.status).toBe('predicted');
    expect(d.statusLabel).toBe('پیش‌بینی');
    expect(d.canEditPeriod).toBe(false);
    expect(d.canLogFromHere).toBe(false);
  });

  it('estimated phases are never presented as recorded, and never offer the pencil', () => {
    const d = at('2026-10-26'); // inside the fertile window
    expect(d.status).toBe('unrecorded');
    expect(d.title).toContain('تخمینی');
    expect(d.canEditPeriod).toBe(false);
  });

  it('a past day with nothing recorded can start a period; a future one cannot', () => {
    expect(describeCalendarDay('2026-10-05', TODAY, undefined).canLogFromHere).toBe(true);
    expect(describeCalendarDay('2026-12-30', TODAY, undefined).canLogFromHere).toBe(false);
  });

  it('a late (past, unlogged) predicted day offers logging', () => {
    const late = buildCycleDateMap([{ ...RECORDED, next_period_start_date: '2026-10-21' }]);
    const d = describeCalendarDay('2026-10-21', TODAY, late.get('2026-10-21'));
    expect(d.status).toBe('late');
    expect(d.canLogFromHere).toBe(true);
  });
});

describe('calendarCellA11yLabel', () => {
  it('states period status, today and selection in words, not colour', () => {
    const rec = describeCalendarDay('2026-10-16', TODAY, { type: 'period', periodId: 1 });
    expect(calendarCellA11yLabel('۲۴ مهر', rec, { isToday: false, isSelected: true })).toBe(
      '۲۴ مهر، دوره‌ی ثبت‌شده، انتخاب‌شده',
    );
    const pred = describeCalendarDay('2026-11-12', TODAY, { type: 'predicted_period' });
    expect(calendarCellA11yLabel('۲۱ آبان', pred, { isToday: false, isSelected: false })).toContain(
      'پیش‌بینی‌شده',
    );
    const none = describeCalendarDay('2026-10-23', TODAY, undefined);
    expect(calendarCellA11yLabel('۱ آبان', none, { isToday: true, isSelected: false })).toBe('۱ آبان، امروز');
  });
});

describe('validatePeriodDraft', () => {
  const base = { start: '2026-10-14', end: '2026-10-19', symptoms: '', medication: '' };
  it('accepts a valid range and a one-day period', () => {
    expect(validatePeriodDraft(base, TODAY).ok).toBe(true);
    expect(validatePeriodDraft({ ...base, end: base.start }, TODAY).ok).toBe(true);
  });
  it('rejects an end before the start, in plain Persian', () => {
    const r = validatePeriodDraft({ ...base, end: '2026-10-13' }, TODAY);
    expect(r).toMatchObject({ ok: false, field: 'end' });
    expect(r.message).toContain('پایان');
  });
  it('rejects future dates and accepts an ongoing period', () => {
    expect(validatePeriodDraft({ ...base, start: '2026-10-30' }, TODAY).field).toBe('start');
    expect(validatePeriodDraft({ ...base, end: '2026-10-30' }, TODAY).field).toBe('end');
    expect(validatePeriodDraft({ ...base, end: null }, TODAY).ok).toBe(true);
  });
  it('accepts a period spanning a month boundary', () => {
    expect(validatePeriodDraft({ ...base, start: '2026-09-28', end: '2026-10-03' }, TODAY).ok).toBe(true);
  });
});

describe('buildPeriodPatch', () => {
  const orig = periodDraftFromRecord({ start_date: '2026-10-14', end_date: '2026-10-19', symptoms: 'cramps', medication: '' });

  it('sends nothing when nothing changed', () => {
    expect(buildPeriodPatch(orig, { ...orig })).toEqual({});
    expect(hasPeriodChanges(orig, { ...orig })).toBe(false);
  });
  it('sends only the changed fields', () => {
    expect(buildPeriodPatch(orig, { ...orig, start: '2026-10-15' })).toEqual({ start_date: '2026-10-15' });
    expect(buildPeriodPatch(orig, { ...orig, end: '2026-10-20' })).toEqual({ end_date: '2026-10-20' });
  });
  it('clears with null and empty string, which JSON keeps (undefined is dropped)', () => {
    const patch = buildPeriodPatch(orig, { ...orig, end: null, symptoms: '' });
    expect(patch).toEqual({ end_date: null, symptoms: '' });
    expect(JSON.parse(JSON.stringify(patch))).toEqual({ end_date: null, symptoms: '' });
  });
});

describe('review lines and span', () => {
  const orig = { start: '2026-10-14', end: '2026-10-19' as string | null, symptoms: '', medication: '' };
  it('lists exactly the date changes', () => {
    const lines = describePeriodChange(orig, { ...orig, start: '2026-10-15', end: null });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('شروع');
    expect(lines[1]).toContain('پایان');
    expect(lines[1]).toContain('در جریان');
  });
  it('computes an inclusive length, null while ongoing', () => {
    expect(periodLengthDays(orig)).toBe(6);
    expect(periodLengthDays({ start: '2026-10-14', end: null })).toBeNull();
  });
});

describe('mapPeriodError', () => {
  const http = (status: number, data: any) => ({ response: { status, data } });

  it('maps the server future-date refusals to Persian, on the right field', () => {
    const end = mapPeriodError(http(400, { end_date: ['End date cannot be in the future.'] }));
    expect(end.field).toBe('end');
    expect(end.message).toContain('آینده');
    expect(end.message).not.toMatch(/[A-Za-z]/);
    const start = mapPeriodError(http(400, { start_date: ['Start date cannot be in the future.'] }));
    expect(start.field).toBe('start');
    expect(start.message).toContain('آینده');
  });

  it('keeps the ordering message for a plain end-before-start error', () => {
    const r = mapPeriodError(http(400, { end_date: ['End date must be on or after start date.'] }));
    expect(r.message).toContain('بعد از آن');
  });

  it('an HTML gateway page is a retryable Persian error, never raw markup', () => {
    const r = mapPeriodError(http(502, '<html><body>502 Bad Gateway</body></html>'));
    expect(r.retryable).toBe(true);
    expect(r.message).not.toMatch(/[<A-Za-z]/);
  });

  it('explains an overlap with the dates of the clashing period', () => {
    const r = mapPeriodError(
      http(400, {
        error: ['This period overlaps with another cycle.'],
        overlapping_period_id: ['2'],
        overlapping_period_start: ['2026-09-15'],
        overlapping_period_end: ['2026-09-20'],
      }),
    );
    expect(r.message).toContain('هم‌پوشانی');
    expect(r.message).toContain('از');
    expect(r.retryable).toBe(false);
    expect(r.message).not.toMatch(/overlap/i);
  });
  it('explains an end date before the start', () => {
    const r = mapPeriodError(http(400, { end_date: ['End date must be on or after the start date.'] }));
    expect(r).toMatchObject({ field: 'end', retryable: false });
    expect(r.message).not.toMatch(/End date/);
  });
  it('explains an unfinished earlier period', () => {
    expect(mapPeriodError(http(400, { error: 'You already have an active period.', active_period_id: 1 })).message).toContain('پایان');
  });
  it('treats a network failure as retryable and says the changes are kept', () => {
    const r = mapPeriodError({ message: 'Network Error' });
    expect(r.retryable).toBe(true);
    expect(r.message).toContain('اتصال');
  });
  it('maps 404, 403 and 5xx to plain Persian', () => {
    expect(mapPeriodError(http(404, {})).message).toContain('پیدا نشد');
    expect(mapPeriodError(http(403, {})).retryable).toBe(false);
    expect(mapPeriodError(http(502, {})).retryable).toBe(true);
  });
});

describe('pickCurrentPeriod (Home card)', () => {
  const mk = (id: number, start: string, end: string | null) => ({ id, start_date: start, end_date: end });

  it('is null with no periods, and ignores a latest period that starts in the future', () => {
    expect(pickCurrentPeriod([], TODAY)).toBeNull();
    expect(pickCurrentPeriod(undefined, TODAY)).toBeNull();
    expect(pickCurrentPeriod([mk(1, '2026-10-30', null)], TODAY)).toBeNull();
  });

  it('shows an ongoing period with its day number', () => {
    const v = pickCurrentPeriod([mk(1, '2026-10-20', null)], TODAY)!;
    expect(v.state).toBe('ongoing');
    expect(v.dayNumber).toBe(4);
    expect(v.end_date).toBeNull();
  });

  it('shows a period that ended within 7 days as recent, and the last day as still recent', () => {
    expect(pickCurrentPeriod([mk(1, '2026-10-14', '2026-10-19')], TODAY)!.state).toBe('recent');
    expect(pickCurrentPeriod([mk(1, '2026-10-10', '2026-10-16')], TODAY)!.state).toBe('recent');
  });

  it('still shows the LAST period when it is older, as "past" (never missing)', () => {
    const v = pickCurrentPeriod([mk(1, '2026-09-01', '2026-09-06')], TODAY)!;
    expect(v.state).toBe('past');
    expect(v.daysSinceEnd).toBe(47);
  });

  it('always picks the latest by start date, regardless of list order', () => {
    const v = pickCurrentPeriod([mk(1, '2026-08-01', '2026-08-05'), mk(3, '2026-10-14', '2026-10-19'), mk(2, '2026-09-01', '2026-09-05')], TODAY)!;
    expect(v.id).toBe(3);
  });

  it('follows edits: reopening a period makes it ongoing again; correcting the end updates the state', () => {
    const before = pickCurrentPeriod([mk(1, '2026-10-14', '2026-10-19')], TODAY)!;
    const reopened = pickCurrentPeriod([mk(1, '2026-10-14', null)], TODAY)!;
    expect(before.state).toBe('recent');
    expect(reopened.state).toBe('ongoing');
    expect(reopened.dayNumber).toBe(10);
  });
});
