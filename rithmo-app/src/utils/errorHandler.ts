import type { ApiError, TypedAxiosError } from '@types/api.types';

/**
 * Turn an error into something a Persian-speaking user can act on.
 *
 * This used to fall through to `axiosError.message` and, failing that, to an
 * English sentence. Both reach the user: a failed login surfaced the literal
 * string «No refresh token available» inside an otherwise Persian alert, and
 * a dropped connection surfaced «Network Error». Neither means anything to
 * the person reading it, and both break the rule that no raw English reaches
 * the UI.
 *
 * The rule here is the same transformation boundary the rest of the app
 * uses: recognise the condition, then say something Persian about it. An
 * unrecognised error becomes a generic Persian message rather than leaking
 * whatever the exception happened to carry.
 */

/**
 * Technical strings that can reach this function, mapped to what the user
 * actually needs to know. Matched case-insensitively as substrings because
 * the exact wording comes from axios, our own interceptor, and DRF.
 */
const KNOWN_MESSAGES: Array<[RegExp, string]> = [
  // Our own refresh interceptor, when the stored session is gone.
  [/no refresh token/i, 'نشستِ قبلی معتبر نیست. دوباره وارد شو.'],
  [/token .*(not valid|invalid|expired)/i, 'نشستت منقضی شده. دوباره وارد شو.'],
  // djoser / simplejwt credential failures.
  [/no active account/i, 'نام کاربری یا رمز عبور درست نیست.'],
  [/unable to log in|invalid credentials/i, 'نام کاربری یا رمز عبور درست نیست.'],
  [/not found/i, 'موردی پیدا نشد.'],
  // Transport-level.
  [/network error/i, 'اتصال اینترنت برقرار نیست.'],
  [/timeout/i, 'پاسخی دریافت نشد. دوباره تلاش کن.'],
  [/aborted|canceled/i, 'درخواست نیمه‌کاره ماند. دوباره تلاش کن.'],
];

const GENERIC = 'مشکلی پیش آمد. دوباره تلاش کن.';

/** True when a string is predominantly Latin — i.e. not fit to show. */
function isLatin(text: string): boolean {
  return /[A-Za-z]/.test(text) && !/[؀-ۿ]/.test(text);
}

function translate(raw: string): string {
  for (const [pattern, message] of KNOWN_MESSAGES) {
    if (pattern.test(raw)) { return message; }
  }
  // A server message already in Persian is the most specific thing we have,
  // so pass it through. Anything Latin is a developer string.
  return isLatin(raw) ? GENERIC : raw;
}

export function extractErrorMessage(error: unknown): string {
  const axiosError = error as TypedAxiosError;

  if (axiosError?.response?.data) {
    const data = axiosError.response.data as ApiError;

    if (data.detail) { return translate(String(data.detail)); }
    if (data.non_field_errors?.length) {
      return translate(String(data.non_field_errors[0]));
    }

    // First field-level error. The field NAME is a developer identifier, so
    // it is never shown — only the message it carries.
    const firstField = Object.keys(data).find(
      (k) => k !== 'detail' && k !== 'non_field_errors',
    );
    if (firstField) {
      const fieldError = (data as Record<string, unknown>)[firstField];
      if (Array.isArray(fieldError) && fieldError.length) {
        return translate(String(fieldError[0]));
      }
      if (typeof fieldError === 'string') { return translate(fieldError); }
    }
  }

  if (axiosError?.message) { return translate(axiosError.message); }
  return GENERIC;
}

export function isUnauthorizedError(error: unknown): boolean {
  return (error as TypedAxiosError)?.response?.status === 401;
}

export function isNetworkError(error: unknown): boolean {
  const axiosError = error as TypedAxiosError;
  return !axiosError?.response && !!axiosError?.message;
}
