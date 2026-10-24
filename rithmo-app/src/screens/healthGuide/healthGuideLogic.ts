/**
 * Pure logic and fixed Persian copy for the contraception / sexual-health area.
 *
 * Rules this file keeps (and its test pins):
 *  - no sentence says tracking, a reminder or the calendar prevents pregnancy;
 *  - no number of hours, doses or "safe days" is stated here: guidance numbers
 *    come only from the server's reviewed articles;
 *  - the bundled safety cards are a last-resort fallback for when the guide
 *    cannot be loaded; they only say who to ask and that time matters;
 *  - the app never words a diagnosis from a record.
 */
import { faDateShort, toFa } from '@utils/persian';
import { extractErrorMessage } from '@utils/errorHandler';
import type { GuideArea, GuideMeta } from '@types/healthGuide.types';
import type {
  CheckType,
  ContraceptionReminder,
  MethodCode,
  NoticeCode,
} from '@types/reproductiveRecords.types';

export const METHOD_LABELS: Record<MethodCode, string> = {
  male_condom: 'کاندوم مردانه',
  female_condom: 'کاندوم زنانه',
  combined_pill: 'قرص ترکیبی',
  progestin_pill: 'قرص فقط‌پروژسترونی',
  patch: 'چسب پوستی',
  ring: 'حلقه‌ی واژینال',
  injection: 'آمپول پیشگیری',
  implant: 'ایمپلنت',
  hormonal_iud: 'آی‌یو‌دی هورمونی',
  copper_iud: 'آی‌یو‌دی مسی',
  vasectomy: 'وازکتومی',
  tubal_sterilization: 'بستن لوله‌ها',
  withdrawal: 'بیرون‌کشیدن',
  fertility_awareness: 'روش‌های آگاهی از باروری',
  other: 'روش دیگر',
};

export const METHOD_CODES = Object.keys(METHOD_LABELS) as MethodCode[];

export const CHECK_LABELS: Record<CheckType, string> = {
  sti_screening: 'آزمایش عفونت‌های منتقل‌شونده‌ی جنسی',
  hpv_vaccine: 'واکسن HPV',
  hepatitis_b_vaccine: 'واکسن هپاتیت B',
  checkup: 'معاینه‌ی سلامت جنسی',
};
export const CHECK_TYPES = Object.keys(CHECK_LABELS) as CheckType[];

export const AREA_TITLES: Record<GuideArea, string> = {
  contraception: 'پیشگیری از بارداری',
  sexual_health: 'سلامت جنسی',
};

export const NOTICE_ICONS: Record<NoticeCode, string> = {
  pregnancy_active: 'information-outline',
  trying_to_conceive: 'information-outline',
  hormonal_method_cycle: 'information-outline',
};

export const HUB_INTRO_FA =
  'آموزش‌های این بخش برای همه آزاد است و برای دیدنشان لازم نیست چیزی ثبت کنی یا کسی را دعوت کنی.';
export const NOT_MEDICAL_ADVICE_FA = 'این اطلاعات آموزشی است و جای نظر پزشک یا ماما را نمی‌گیرد.';
export const NOT_CONTRACEPTION_FA =
  'تقویم یا پیش‌بینی چرخه‌ی ریتمو روش پیشگیری از بارداری نیست و روز «امن» را مشخص نمی‌کند.';
export const PRIVACY_NOTE_FA =
  'ثبت‌هایی که اینجا می‌کنی فقط برای خودت است: در اعلان‌ها و روی صفحه‌ی قفل نمی‌آید و با شریکت به اشتراک گذاشته نمی‌شود.';
export const TRACKING_NOT_PREVENTION_FA =
  'ثبت یک روش یا ساختن یادآور از بارداری جلوگیری نمی‌کند؛ اثربخشی به نوع روش و استفاده‌ی درست بستگی دارد.';
export const REMINDER_NOTE_FA =
  'یادآور فقط همان برنامه‌ای را به تو یادآوری می‌کند که خودت (یا پزشکت) تعیین کرده‌ای؛ ریتمو فاصله‌ی زمانی یا مقدار پیشنهاد نمی‌دهد.';
export const NO_CONTENT_YET_FA =
  'این راهنما پیش از انتشار توسط متخصص بازبینی می‌شود و هنوز آماده‌ی نمایش نیست. در این فاصله، اگر موضوع فوری است با داروخانه، پزشک یا مرکز بهداشت صحبت کن.';
export const CHECKS_NOTE_FA =
  'فقط تاریخ ثبت می‌شود، نه نتیجه. ریتمو از روی این تاریخ‌ها چیزی را تشخیص نمی‌دهد.';
export const SEXUAL_SYMPTOMS_NOTE_FA =
  'اگر نشانه‌ای نگرانت کرده، بدون اینکه ریتمو چیزی را نتیجه بگیرد، با پزشک یا ماما صحبت کن؛ نبودن نشانه هم یعنی نبودن عفونت نیست.';

/** Only used when the guide cannot be loaded (offline, or nothing approved yet). */
export const ESSENTIAL_SAFETY_FALLBACK: Array<{ slug: string; title: string; text: string }> = [
  {
    slug: 'emergency-contraception',
    title: 'اگر رابطه‌ی محافظت‌نشده داشتی',
    text: 'زمان مهم است. هرچه زودتر با داروخانه، پزشک یا مرکز بهداشت صحبت کن؛ ریتمو نمی‌تواند توصیه‌ی شخصی بدهد.',
  },
  {
    slug: 'missed-or-failed-method',
    title: 'اگر روش پیشگیری را فراموش کردی یا شکست خورد',
    text: 'دستور همان بسته یا نظر داروساز یا پزشک را ملاک قرار بده. اگر بعد از آن رابطه‌ی محافظت‌نشده داشتی، هرچه زودتر با داروخانه یا پزشک صحبت کن.',
  },
  {
    slug: 'sti-without-symptoms',
    title: 'نبودن نشانه یعنی نبودن عفونت نیست',
    text: 'بسیاری از عفونت‌های منتقل‌شونده‌ی جنسی نشانه ندارند. برای آزمایش با پزشک یا مرکز بهداشت صحبت کن.',
  },
];

/** Stable server codes to wording. The server never sends prose for errors. */
const ERROR_TEXT: Record<string, string> = {
  invalid: 'اطلاعاتی که وارد کردی درست نیست. دوباره بررسی کن.',
  unknown_method: 'این روش شناخته نشد.',
  unknown_kind: 'این نوع یادآور شناخته نشد.',
  unknown_type: 'این مورد شناخته نشد.',
  unknown_record: 'این روش پیدا نشد.',
  started_on_in_future: 'تاریخ شروع نمی‌تواند در آینده باشد.',
  stopped_on_in_future: 'تاریخ پایان نمی‌تواند در آینده باشد.',
  done_on_in_future: 'تاریخ انجام نمی‌تواند در آینده باشد.',
  started_on_too_old: 'این تاریخ خیلی قدیمی است.',
  stopped_on_too_old: 'این تاریخ خیلی قدیمی است.',
  done_on_too_old: 'این تاریخ خیلی قدیمی است.',
  stopped_before_started: 'تاریخ پایان باید همان روز شروع یا بعد از آن باشد.',
  overlaps_same_method: 'برای همین روش، بازه‌ی دیگری با این تاریخ‌ها ثبت شده است.',
  too_many_reminders: 'حداکثر ۶ یادآور فعال می‌توانی داشته باشی.',
  bad_interval: 'فاصله‌ی روزها باید بین ۱ تا ۳۶۵ باشد.',
  bad_offset: 'ساعت دستگاه درست خوانده نشد.',
  anchor_required: 'تاریخ شروع یادآور را انتخاب کن.',
  anchor_too_old: 'این تاریخ خیلی قدیمی است.',
  record_stopped: 'این روش متوقف شده و برایش یادآور ساخته نمی‌شود.',
  next_due_not_after: 'تاریخ بعدی باید بعد از تاریخ انجام باشد.',
  next_due_too_far: 'این تاریخ خیلی دور است.',
  not_found: 'این مورد دیگر وجود ندارد.',
};

export function errorCode(error: unknown): string | null {
  const code = (error as { response?: { data?: { code?: unknown } } })?.response?.data?.code;
  return typeof code === 'string' ? code : null;
}

export function errorMessageFor(error: unknown): string {
  const code = errorCode(error);
  if (code && ERROR_TEXT[code]) { return ERROR_TEXT[code]; }
  return extractErrorMessage(error);
}

export function isNotFound(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 404;
}

export function describeReminder(r: Pick<ContraceptionReminder, 'kind' | 'time_local' | 'interval_days' | 'anchor_date'>): string {
  const at = `ساعت ${toFa(r.time_local)}`;
  if (r.kind === 'daily') { return `هر روز، ${at}`; }
  if (r.kind === 'every_n_days') {
    const from = r.anchor_date ? `، از ${faDateShort(r.anchor_date)}` : '';
    return `هر ${toFa(r.interval_days ?? 0)} روز${from}، ${at}`;
  }
  return `یک‌بار، ${r.anchor_date ? faDateShort(r.anchor_date) : ''}، ${at}`;
}

export function reviewLine(m: Pick<GuideMeta, 'reviewed_on' | 'reviewer_credential' | 'review_overdue'>): string {
  const parts: string[] = [];
  if (m.reviewed_on) {
    parts.push(`بازبینی‌شده${m.reviewer_credential ? ` توسط ${m.reviewer_credential}` : ''}، ${faDateShort(m.reviewed_on)}`);
  }
  if (m.review_overdue) { parts.push('زمان بازبینی بعدی گذشته است.'); }
  return parts.join(' ');
}

/** Persian and Arabic-Indic digits to Latin, so a Persian keyboard works. */
export function toLatinDigits(text: string): string {
  return text.replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660));
}

/** A whole number from user text, or null (empty, decimal or not a number). */
export function parseWhole(text: string): number | null {
  const t = toLatinDigits(text).trim();
  return /^\d{1,4}$/.test(t) ? Number(t) : null;
}

/** "21:30" -> {h, m}; null when it is not a valid 24h time. */
export function parseTime(text: string): { h: number; m: number } | null {
  const mt = /^(\d{1,2}):(\d{2})$/.exec(toLatinDigits(text).trim());
  if (!mt) { return null; }
  const h = Number(mt[1]);
  const m = Number(mt[2]);
  return h <= 23 && m <= 59 ? { h, m } : null;
}

export function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** The device's own UTC offset in minutes (what the server stores with a reminder). */
export function deviceUtcOffsetMinutes(now: Date = new Date()): number {
  return -now.getTimezoneOffset();
}

/** Essential-safety articles first, then the rest, keeping the server order. */
export function splitGuide(articles: GuideMeta[]) {
  return {
    essential: articles.filter((a) => a.is_essential_safety),
    byArea: (area: GuideArea) => articles.filter((a) => a.area === area && a.kind !== 'comparison' && !a.is_essential_safety),
    comparison: articles.find((a) => a.kind === 'comparison') ?? null,
  };
}

/** Typical-use figure as text: "۱۳ از ۱۰۰" (never "۱۳٪ مؤثر"). */
export function perHundred(value: number | null | undefined): string {
  if (value == null) { return 'نامشخص'; }
  return `${toFa(value)} از ۱۰۰`;
}

/** Every icon name the screens in this area ask for (checked against the glyph map by a test). */
export const GUIDE_ICON_NAMES = [
  'heart-pulse', 'shield-check-outline', 'book-open-variant', 'bell-outline', 'plus', 'delete-outline',
  'alert-circle-outline', 'information-outline', 'chevron-down', 'chevron-up', 'chevron-left',
  'calendar-check-outline', 'lock-outline', 'stethoscope', 'table', 'clipboard-text-outline',
] as const;
