/**
 * Reproductive goal - pure content + state logic (no React, no network).
 *
 * The goal is OPTIONAL, owner-only and user-chosen. Nothing here infers it,
 * and nothing in the app changes behaviour because of it yet: predictions,
 * notifications, Today and Premium are untouched. The screen says so.
 *
 * Copy review status: general supportive wording, written to avoid every claim
 * the product must not make (contraception, "safe days", conception promises,
 * fertile window = confirmed ovulation). It has NOT had clinical review.
 */
import type { ReproductiveGoal, ReproductiveGoalPayload } from '@types/reproductiveGoal.types';

export interface GoalOption {
  value: ReproductiveGoal;
  label: string;
  hint: string;
  icon: string;
}

export const GOAL_OPTIONS: readonly GoalOption[] = [
  { value: 'track_cycle', label: 'پیگیری چرخه‌ام', hint: 'فقط می‌خواهم چرخه و حال‌وهوایم را ثبت و دنبال کنم.', icon: 'calendar-heart' },
  { value: 'trying_to_conceive', label: 'تلاش برای بارداری', hint: 'می‌خواهم باردار شوم.', icon: 'heart-plus-outline' },
  { value: 'avoid_pregnancy', label: 'نمی‌خواهم باردار شوم', hint: 'فعلاً قصد بارداری ندارم.', icon: 'shield-outline' },
  { value: 'unsure', label: 'ترجیح می‌دهم نگویم', hint: 'یا هنوز مطمئن نیستم.', icon: 'minus-circle-outline' },
] as const;

export const GOAL_VALUES: readonly ReproductiveGoal[] = GOAL_OPTIONS.map((o) => o.value);

export const GOAL_INTRO_FA =
  'اگر دوست داری بگو از این برنامه چه می‌خواهی. انتخاب کردنش اختیاری است، فقط برای خودت ذخیره می‌شود و هر وقت خواستی می‌توانی عوضش کنی یا برش داری.';

export const GOAL_NO_CHANGE_FA =
  'فعلاً این انتخاب چیزی را در پیش‌بینی‌ها، اعلان‌ها یا صفحهٔ امروز عوض نمی‌کند و به شریکت هم نشان داده نمی‌شود.';

/** Shown under the list for every user; the two estimate lines always apply. */
export const GOAL_ESTIMATE_NOTE_FA =
  'پیش‌بینی‌های چرخه تخمینی‌اند. «پنجرهٔ باروری» یک برآورد است و تخمک‌گذاری تأییدشده نیست.';

/** Extra line only for the avoid-pregnancy choice. */
export const GOAL_AVOID_NOTE_FA =
  'تقویم و پیش‌بینی چرخه روش پیشگیری از بارداری نیست و روز «امن» مشخص نمی‌کند. برای انتخاب روش مناسب با پزشک یا مشاور سلامت جنسی صحبت کن.';

/** Extra line only for the trying-to-conceive choice. */
export const GOAL_TTC_NOTE_FA =
  'پنجرهٔ باروری فقط یک تخمین است و نتیجه‌ای را تضمین نمی‌کند. این انتخاب «حالت تلاش برای بارداری» را روشن نمی‌کند؛ آن حالت جدا و در پروفایل است.';

export const GOAL_REMOVE_LABEL_FA = 'برداشتن انتخاب';

export function goalLabel(goal: ReproductiveGoal | null | undefined): string {
  if (!goal) { return 'انتخاب نشده'; }
  return GOAL_OPTIONS.find((o) => o.value === goal)?.label ?? 'انتخاب نشده';
}

/** Which extra safety line, if any, belongs under the CURRENT saved choice. */
export function goalNoteFor(goal: ReproductiveGoal | null | undefined): string | null {
  if (goal === 'avoid_pregnancy') { return GOAL_AVOID_NOTE_FA; }
  if (goal === 'trying_to_conceive') { return GOAL_TTC_NOTE_FA; }
  return null;
}

/**
 * unset vs chosen vs "prefer not to say". `unsure` is an explicit, saved
 * answer; `unset` means never chosen or removed. They differ in what the
 * screen offers (remove is only meaningful once something is saved).
 */
export type GoalState = 'unset' | 'chosen' | 'declined';

export function goalState(payload: ReproductiveGoalPayload | undefined | null): GoalState {
  const g = payload?.goal;
  if (g == null) { return 'unset'; }
  return g === 'unsure' ? 'declined' : 'chosen';
}

/** Defensive parse: anything the server did not promise is treated as unset. */
export function parseGoal(value: unknown): ReproductiveGoal | null {
  return typeof value === 'string' && (GOAL_VALUES as readonly string[]).includes(value)
    ? (value as ReproductiveGoal)
    : null;
}

export type GoalErrorKind = 'unsupported' | 'rate_limited' | 'offline' | 'validation' | 'unauthorized' | 'server';

interface ErrLike {
  response?: { status?: number };
  message?: string;
}

/**
 * Maps a failed request to a UX bucket. 403 is "this account type has no goal"
 * (partner / male profile), NOT a transient failure: the screen explains it and
 * offers no retry, so there is no loop.
 */
export function classifyGoalError(error: unknown): GoalErrorKind {
  const e = error as ErrLike | null | undefined;
  const status = e?.response?.status;
  if (status === 403) { return 'unsupported'; }
  if (status === 429) { return 'rate_limited'; }
  if (status === 400) { return 'validation'; }
  if (status === 401) { return 'unauthorized'; }
  if (status === undefined && e?.message) { return 'offline'; }
  return 'server';
}

export const GOAL_ERROR_FA: Record<GoalErrorKind, string> = {
  unsupported: 'این بخش برای حساب تو در دسترس نیست.',
  rate_limited: 'چند لحظه صبر کن و دوباره امتحان کن.',
  offline: 'اتصال اینترنت برقرار نیست. ذخیره نشد؛ دوباره امتحان کن.',
  validation: 'این گزینه پذیرفته نشد. یکی از گزینه‌های فهرست را انتخاب کن.',
  unauthorized: 'ورود تو منقضی شده است. دوباره وارد شو.',
  server: 'ذخیره نشد. کمی بعد دوباره امتحان کن.',
};
