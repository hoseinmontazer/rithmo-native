/**
 * No raw English may reach a Persian user — including from exceptions.
 *
 * Observed on device: a failed login rendered the alert «ورود ناموفق بود»
 * with the body "No refresh token available" — a string thrown by our own
 * axios interceptor, shown verbatim to someone who cannot read it and which
 * describes an internal condition rather than anything she can act on.
 */

import { extractErrorMessage, isNetworkError, isUnauthorizedError } from '@utils/errorHandler';

const LATIN = /[A-Za-z]/;

function axiosError(message: string) {
  return { message, isAxiosError: true };
}

function responseError(data: unknown, status = 400) {
  return { message: 'Request failed', response: { status, data }, isAxiosError: true };
}

describe('technical strings never reach the user', () => {
  it('translates our own interceptor error', () => {
    const out = extractErrorMessage(axiosError('No refresh token available'));
    expect(out).toBe('نشستِ قبلی معتبر نیست. دوباره وارد شو.');
    expect(out).not.toMatch(LATIN);
  });

  it('translates transport failures', () => {
    expect(extractErrorMessage(axiosError('Network Error'))).toBe('اتصال اینترنت برقرار نیست.');
    expect(extractErrorMessage(axiosError('timeout of 15000ms exceeded')))
      .toBe('پاسخی دریافت نشد. دوباره تلاش کن.');
  });

  it('translates the credential failure DRF returns', () => {
    const out = extractErrorMessage(
      responseError({ detail: 'No active account found with the given credentials' }, 401),
    );
    expect(out).toBe('نام کاربری یا رمز عبور درست نیست.');
  });

  it('falls back to Persian for an unrecognised English message', () => {
    const out = extractErrorMessage(axiosError('ECONNREFUSED 127.0.0.1:8123'));
    expect(out).toBe('مشکلی پیش آمد. دوباره تلاش کن.');
    expect(out).not.toMatch(LATIN);
  });

  it('never returns Latin text for any input shape', () => {
    const inputs: unknown[] = [
      undefined,
      null,
      {},
      new Error('Something exploded'),
      axiosError('Unexpected token < in JSON'),
      responseError({ detail: 'Internal Server Error' }, 500),
      responseError({ non_field_errors: ['Unable to log in with provided credentials.'] }),
      responseError({ username: ['This field may not be blank.'] }),
    ];
    for (const input of inputs) {
      expect(extractErrorMessage(input)).not.toMatch(LATIN);
    }
  });
});

describe('server messages already in Persian pass through', () => {
  it('keeps a Persian detail verbatim — it is the most specific thing we have', () => {
    const out = extractErrorMessage(responseError({ detail: 'این دوره با دوره‌ی دیگری هم‌پوشانی دارد.' }));
    expect(out).toBe('این دوره با دوره‌ی دیگری هم‌پوشانی دارد.');
  });

  it('keeps a Persian field-level error', () => {
    const out = extractErrorMessage(responseError({ start_date: ['تاریخ نامعتبر است.'] }));
    expect(out).toBe('تاریخ نامعتبر است.');
  });

  it('never shows the developer field name alongside it', () => {
    // The old implementation returned "start_date: ...".
    const out = extractErrorMessage(responseError({ start_date: ['تاریخ نامعتبر است.'] }));
    expect(out).not.toContain('start_date');
  });
});

describe('error classification still works', () => {
  it('detects 401', () => {
    expect(isUnauthorizedError(responseError({}, 401))).toBe(true);
    expect(isUnauthorizedError(responseError({}, 400))).toBe(false);
  });

  it('detects a network error', () => {
    expect(isNetworkError(axiosError('Network Error'))).toBe(true);
    expect(isNetworkError(responseError({}, 500))).toBe(false);
  });
});
