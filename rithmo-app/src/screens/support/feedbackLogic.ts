/**
 * In-app feedback - pure content + validation + error classification.
 *
 * Client checks exist for usability only; the server (ProductFeedbackView) is
 * authoritative. Nothing here reads the user's reproductive goal, and the topic
 * and text are never passed to analytics or logs.
 */
import type { FeedbackRequest, FeedbackTopic } from '@types/support.types';

export const FEEDBACK_TEXT_MAX = 1000;

export const FEEDBACK_TOPICS: readonly { value: FeedbackTopic; label: string }[] = [
  { value: 'ttc', label: 'تلاش برای بارداری' },
  { value: 'avoid_pregnancy', label: 'نخواستن بارداری' },
  { value: 'cycle_tracking', label: 'پیگیری چرخه' },
  { value: 'partner_experience', label: 'تجربهٔ شریک' },
  { value: 'pricing', label: 'قیمت و پرمیوم' },
  { value: 'other', label: 'سایر' },
] as const;

export const FEEDBACK_INTRO_FA =
  'نظرت دربارهٔ برنامه برای ما مهم است. نوشتن متن اختیاری است و نیازی به پرمیوم ندارد.';

export const FEEDBACK_CONTACT_LABEL_FA = 'اجازه می‌دهم برای پرسیدن توضیح بیشتر با من تماس بگیرند';
export const FEEDBACK_CONTACT_HINT_FA =
  'اختیاری است. چیزی از تو نمی‌خواهیم و اطلاعات تماس جدیدی ثبت نمی‌شود؛ فقط از راه همین حساب پاسخ داده می‌شود.';

export const FEEDBACK_PRIVACY_FA =
  'هدف یا اطلاعات چرخه‌ات همراه این پیام فرستاده نمی‌شود. فقط همان چیزی که اینجا انتخاب یا می‌نویسی ارسال می‌شود.';

export const FEEDBACK_SUCCESS_FA = 'ممنون، پیامت ثبت شد.';
export const FEEDBACK_DUPLICATE_FA = 'این پیام را قبلاً فرستاده بودی و ثبت شده است.';

export type FeedbackFormValues = {
  topic: FeedbackTopic | null;
  text: string;
  contactOk: boolean;
};

export type FeedbackValidation =
  | { ok: true; request: FeedbackRequest }
  | { ok: false; field: 'topic' | 'text'; message: string };

export function validateFeedback(v: FeedbackFormValues): FeedbackValidation {
  if (v.topic == null || !FEEDBACK_TOPICS.some((t) => t.value === v.topic)) {
    return { ok: false, field: 'topic', message: 'یک موضوع انتخاب کن.' };
  }
  const text = v.text.trim();
  if (text.length > FEEDBACK_TEXT_MAX) {
    return { ok: false, field: 'text', message: `متن حداکثر ${FEEDBACK_TEXT_MAX} نویسه باشد.` };
  }
  // contact_ok is always sent as an explicit boolean; default false.
  const request: FeedbackRequest = { category: v.topic, contact_ok: v.contactOk === true };
  if (text) { request.text = text; }
  return { ok: true, request };
}

export const INITIAL_FEEDBACK: FeedbackFormValues = { topic: null, text: '', contactOk: false };

export type FeedbackErrorKind = 'rate_limited' | 'offline' | 'validation' | 'unauthorized' | 'server';

interface ErrLike {
  response?: { status?: number };
  message?: string;
}

export function classifyFeedbackError(error: unknown): FeedbackErrorKind {
  const e = error as ErrLike | null | undefined;
  const status = e?.response?.status;
  if (status === 429) { return 'rate_limited'; }
  if (status === 400) { return 'validation'; }
  if (status === 401) { return 'unauthorized'; }
  if (status === undefined && e?.message) { return 'offline'; }
  return 'server';
}

export const FEEDBACK_ERROR_FA: Record<FeedbackErrorKind, string> = {
  rate_limited: 'چند پیام پشت سر هم فرستادی. کمی صبر کن و دوباره امتحان کن.',
  offline: 'اتصال اینترنت برقرار نیست. پیام ارسال نشد؛ متنت همین‌جا مانده، دوباره امتحان کن.',
  validation: 'پیام پذیرفته نشد. موضوع و طول متن را بررسی کن.',
  unauthorized: 'ورود تو منقضی شده است. دوباره وارد شو.',
  server: 'پیام ارسال نشد. کمی بعد دوباره امتحان کن.',
};

/** What the confirmed server answer means for the user. Only call on a 2xx. */
export function successMessage(res: { duplicate?: boolean } | null | undefined): string {
  return res?.duplicate === true ? FEEDBACK_DUPLICATE_FA : FEEDBACK_SUCCESS_FA;
}
