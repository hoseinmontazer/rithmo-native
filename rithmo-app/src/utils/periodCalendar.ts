/**
 * periodCalendar — the pure rules behind the period calendar and the
 * period-correction flow, kept out of the screens so they can be tested.
 *
 *  - describeCalendarDay: what a tapped date IS (recorded / predicted / late /
 *    unrecorded) and which actions make sense for it.
 *  - validatePeriodDraft / buildPeriodPatch / describePeriodChange: the edit
 *    form's client-side checks, the PATCH body (only changed fields, with
 *    `null` / '' used to CLEAR a value, which `undefined` never could), and the
 *    "review before saving" lines.
 *  - mapPeriodError: backend validation errors (English, list-wrapped) into
 *    plain Persian.
 *
 * Nothing here recomputes cycle predictions: the day type still comes from
 * buildCycleDateMap, and the backend stays authoritative for validation.
 */
import type { DayInfo } from '@utils/cycleDayMap';
import { daysBetween } from '@utils/dateUtils';
import { faDateShort, toFa } from '@utils/persian';

// ── Day description ──────────────────────────────────────────────────────────

export type PeriodDayStatus = 'recorded' | 'predicted' | 'late' | 'unrecorded';

export interface PeriodDayDescription {
  status: PeriodDayStatus;
  /** Short status chip text, e.g. «ثبت‌شده». */
  statusLabel: string;
  /** Headline for the day panel. */
  title: string;
  /** One honest sentence about what the app knows about this date. */
  detail: string;
  /** The recorded period this date belongs to (only for recorded days). */
  periodId: number | null;
  /** Show "edit / correct this period". Only for days inside a recorded period. */
  canEditPeriod: boolean;
  /** Show "log a period starting on this day". Never for future days. */
  canLogFromHere: boolean;
}

const PHASE_TITLES: Record<string, string> = {
  ovulation: 'پنجره‌ی باروری (تخمینی)',
  pms: 'روزهای پیش از دوره (تخمینی)',
  luteal: 'فاز لوتئال (تخمینی)',
  follicular: 'فاز فولیکولار (تخمینی)',
};

export function describeCalendarDay(
  dateStr: string,
  todayStr: string,
  entry: Pick<DayInfo, 'type' | 'periodId' | 'isStart' | 'isEnd'> | undefined,
): PeriodDayDescription {
  const isFuture = dateStr > todayStr;
  const type = entry?.type ?? 'none';
  const canLog = !isFuture;

  if (type === 'period') {
    const edge = entry?.isStart
      ? 'اولین روز این دوره'
      : entry?.isEnd
      ? 'آخرین روز این دوره'
      : null;
    return {
      status: 'recorded',
      statusLabel: 'ثبت‌شده',
      title: 'روز دوره',
      detail: edge
        ? `${edge}؛ خودت ثبتش کرده‌ای. اگر تاریخش درست نیست، اصلاحش کن.`
        : 'این روز جزو دوره‌ای است که خودت ثبت کرده‌ای.',
      periodId: entry?.periodId ?? null,
      canEditPeriod: entry?.periodId != null,
      canLogFromHere: false,
    };
  }

  if (type === 'predicted_period') {
    return {
      status: 'predicted',
      statusLabel: 'پیش‌بینی',
      title: 'دوره‌ی پیش‌بینی‌شده',
      detail: isFuture
        ? 'این روز فقط یک پیش‌بینی است و ثبت نشده. دقیقاً همین روز شروع نمی‌شود، لزوماً.'
        : 'این روز فقط یک پیش‌بینی بود و ثبت نشده. اگر دوره‌ات شروع شده، ثبتش کن.',
      periodId: null,
      canEditPeriod: false,
      canLogFromHere: canLog,
    };
  }

  if (type === 'late') {
    return {
      status: 'late',
      statusLabel: 'دیرکرد',
      title: 'دوره‌ی پیش‌بینی‌شده ثبت نشده',
      detail: 'طبق پیش‌بینی، دوره‌ات باید تا این روز شروع می‌شد. اگر شروع شده، ثبتش کن.',
      periodId: null,
      canEditPeriod: false,
      canLogFromHere: canLog,
    };
  }

  const phaseTitle = PHASE_TITLES[type];
  return {
    status: 'unrecorded',
    statusLabel: 'بدون ثبت',
    title: phaseTitle ?? 'روزی بدون ثبت دوره',
    detail: phaseTitle
      ? 'این یک تخمین از چرخه‌ی توست، نه چیزی که ثبت کرده‌ای.'
      : isFuture
      ? 'برای این روز چیزی ثبت یا پیش‌بینی نشده.'
      : 'در این روز دوره‌ای ثبت نشده است.',
    periodId: null,
    canEditPeriod: false,
    canLogFromHere: canLog,
  };
}

/** Screen-reader label for one calendar cell. `dateLabel` is the spoken date. */
export function calendarCellA11yLabel(
  dateLabel: string,
  desc: PeriodDayDescription,
  flags: { isToday: boolean; isSelected: boolean },
): string {
  const parts = [dateLabel];
  if (desc.status === 'recorded') {parts.push('دوره‌ی ثبت‌شده');}
  else if (desc.status === 'predicted') {parts.push('دوره‌ی پیش‌بینی‌شده');}
  else if (desc.status === 'late') {parts.push('دیرکرد نسبت به پیش‌بینی');}
  if (flags.isToday) {parts.push('امروز');}
  if (flags.isSelected) {parts.push('انتخاب‌شده');}
  return parts.join('، ');
}

// ── Edit draft ───────────────────────────────────────────────────────────────

export interface PeriodDraft {
  /** ISO yyyy-mm-dd */
  start: string;
  /** ISO yyyy-mm-dd, or null for "still ongoing" */
  end: string | null;
  symptoms: string;
  medication: string;
}

export interface DraftValidation {
  ok: boolean;
  field?: 'start' | 'end';
  message?: string;
}

export function validatePeriodDraft(draft: PeriodDraft, todayStr: string): DraftValidation {
  if (!draft.start) {
    return { ok: false, field: 'start', message: 'تاریخ شروع را انتخاب کن.' };
  }
  if (draft.start > todayStr) {
    return { ok: false, field: 'start', message: 'تاریخ شروع نمی‌تواند در آینده باشد.' };
  }
  if (draft.end) {
    if (draft.end < draft.start) {
      return {
        ok: false,
        field: 'end',
        message: 'تاریخ پایان باید همان روز شروع یا بعد از آن باشد.',
      };
    }
    if (draft.end > todayStr) {
      return { ok: false, field: 'end', message: 'تاریخ پایان نمی‌تواند در آینده باشد.' };
    }
  }
  return { ok: true };
}

export function periodDraftFromRecord(p: {
  start_date: string;
  end_date: string | null;
  symptoms?: string | null;
  medication?: string | null;
}): PeriodDraft {
  return {
    start: p.start_date,
    end: p.end_date ?? null,
    symptoms: p.symptoms ?? '',
    medication: p.medication ?? '',
  };
}

export interface PeriodPatch {
  start_date?: string;
  /** `null` explicitly reopens the period; omitted means "unchanged". */
  end_date?: string | null;
  symptoms?: string;
  medication?: string;
}

/**
 * Only the fields that actually changed. A removed end date is sent as `null`
 * and removed symptoms/medication as '' — the previous client sent
 * `undefined` for both, which JSON drops, so the server never saw the
 * change while the app reported success.
 */
export function buildPeriodPatch(original: PeriodDraft, draft: PeriodDraft): PeriodPatch {
  const patch: PeriodPatch = {};
  if (draft.start !== original.start) {patch.start_date = draft.start;}
  if (draft.end !== original.end) {patch.end_date = draft.end;}
  if (draft.symptoms !== original.symptoms) {patch.symptoms = draft.symptoms;}
  if (draft.medication !== original.medication) {patch.medication = draft.medication;}
  return patch;
}

export function hasPeriodChanges(original: PeriodDraft, draft: PeriodDraft): boolean {
  return Object.keys(buildPeriodPatch(original, draft)).length > 0;
}

/** Inclusive length in days; null while the period is ongoing. */
export function periodLengthDays(draft: Pick<PeriodDraft, 'start' | 'end'>): number | null {
  if (!draft.end) {return null;}
  return daysBetween(draft.start, draft.end) + 1;
}

/** The "review before saving" lines (dates only; free text is not diffed). */
export function describePeriodChange(original: PeriodDraft, draft: PeriodDraft): string[] {
  const lines: string[] = [];
  if (draft.start !== original.start) {
    lines.push(`شروع: ${faDateShort(original.start)} ← ${faDateShort(draft.start)}`);
  }
  if (draft.end !== original.end) {
    const from = original.end ? faDateShort(original.end) : 'در جریان';
    const to = draft.end ? faDateShort(draft.end) : 'در جریان (بدون پایان)';
    lines.push(`پایان: ${from} ← ${to}`);
  }
  if (draft.symptoms !== original.symptoms || draft.medication !== original.medication) {
    lines.push('علائم یا داروها تغییر کرده‌اند');
  }
  return lines;
}

export function describePeriodSpan(draft: Pick<PeriodDraft, 'start' | 'end'>): string {
  const len = periodLengthDays(draft);
  const end = draft.end ? faDateShort(draft.end) : 'در جریان';
  return `${faDateShort(draft.start)} تا ${end}${len ? ` (${toFa(len)} روز)` : ''}`;
}

// ── Backend errors → plain Persian ───────────────────────────────────────────

const first = (v: unknown): string => (Array.isArray(v) ? String(v[0] ?? '') : v == null ? '' : String(v));

export interface PeriodErrorInfo {
  message: string;
  /** True when retrying the same request can succeed (network, 5xx). */
  retryable: boolean;
  /** Which form field the message is about, when known. */
  field?: 'start' | 'end';
}

export function mapPeriodError(err: any): PeriodErrorInfo {
  const status: number | undefined = err?.response?.status;
  const data = err?.response?.data;

  if (!err?.response) {
    return {
      message: 'اتصال برقرار نشد. اینترنتت را بررسی کن و دوباره امتحان کن؛ تغییراتت همین‌جا نگه داشته شده.',
      retryable: true,
    };
  }

  if (status === 400 && data && typeof data === 'object') {
    // The server refuses dates after today (UTC+14 bound). The pickers
    // already stop this client-side; this covers a stale/odd clock.
    if (/future/i.test(first(data.end_date))) {
      return { message: 'تاریخ پایان نمی‌تواند در آینده باشد.', retryable: false, field: 'end' };
    }
    if (/future/i.test(first(data.start_date))) {
      return { message: 'تاریخ شروع نمی‌تواند در آینده باشد.', retryable: false, field: 'start' };
    }
    if (data.end_date) {
      return {
        message: 'تاریخ پایان باید همان روز شروع یا بعد از آن باشد.',
        retryable: false,
        field: 'end',
      };
    }
    if (data.start_date) {
      return { message: 'تاریخ شروع پذیرفته نشد. تاریخ دیگری انتخاب کن.', retryable: false, field: 'start' };
    }
    const errText = first(data.error).toLowerCase();
    if (errText.includes('overlap') || data.overlapping_period_id) {
      const s = first(data.overlapping_period_start);
      const e = first(data.overlapping_period_end);
      const span = s ? ` (از ${faDateShort(s)}${e ? ` تا ${faDateShort(e)}` : ''})` : '';
      return {
        message: `این بازه با دوره‌ی دیگری که ثبت کرده‌ای${span} هم‌پوشانی دارد. تاریخ‌ها را عوض کن یا اول همان دوره را اصلاح کن.`,
        retryable: false,
      };
    }
    if (errText.includes('active period') || data.active_period_id) {
      return {
        message: 'دوره‌ی قبلی‌ات هنوز پایان نیافته. اول پایانش را ثبت کن، بعد دوره‌ی جدید را شروع کن.',
        retryable: false,
      };
    }
  }

  if (status === 404) {
    return { message: 'این دوره دیگر پیدا نشد. صفحه را تازه کن و دوباره امتحان کن.', retryable: false };
  }
  if (status === 401 || status === 403) {
    return { message: 'اجازه‌ی این کار را نداری. دوباره وارد شو.', retryable: false };
  }
  if (status && status >= 500) {
    return { message: 'مشکلی در سرور پیش آمد. چند لحظه بعد دوباره امتحان کن.', retryable: true };
  }
  return { message: 'ذخیره نشد. دوباره امتحان کن.', retryable: true };
}

// ── Home "period" card selection ─────────────────────────────────────────────

/** A period that ended up to this many days ago is shown prominently. */
export const RECENT_DAYS = 7;

export type CurrentPeriodState = 'ongoing' | 'recent' | 'past';

export interface CurrentPeriodView {
  id: number;
  start_date: string;
  end_date: string | null;
  symptoms?: string | null;
  medication?: string | null;
  /** ongoing: no end date · recent: ended within RECENT_DAYS · past: older. */
  state: CurrentPeriodState;
  /** 1-based day of the period counted from its start, as of today. */
  dayNumber: number;
  /** Whole days since the recorded end (0 while ongoing). */
  daysSinceEnd: number;
}

/**
 * The period the Home card is about: always the LATEST recorded one, so the
 * last period is never missing. Only its emphasis changes with age. Returns
 * null with no periods, or when the latest start is in the future (bad data
 * the card must not echo).
 */
export function pickCurrentPeriod(periods: any[] | undefined, today: string): CurrentPeriodView | null {
  if (!periods?.length) {return null;}
  const latest = [...periods].sort((a, b) => (a.start_date < b.start_date ? 1 : -1))[0];
  if (!latest || latest.start_date > today) {return null;}
  const dayNumber = daysBetween(latest.start_date, today) + 1;
  if (!latest.end_date) {
    return { ...latest, end_date: null, state: 'ongoing', dayNumber, daysSinceEnd: 0 };
  }
  const daysSinceEnd = Math.max(daysBetween(latest.end_date, today), 0);
  return {
    ...latest,
    state: daysSinceEnd <= RECENT_DAYS ? 'recent' : 'past',
    dayNumber,
    daysSinceEnd,
  };
}
