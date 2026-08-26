/**
 * What a failed sign-in tells the user (F-06 finding 9).
 *
 * Found on a physical device, from a mistyped password rather than a planned
 * step: on a fresh install, a wrong password reported
 *
 *     «نشستِ قبلی معتبر نیست. دوباره وارد شو.»
 *     ("your previous session is invalid, sign in again")
 *
 * to a user who had never had a session. The mapping for bad credentials
 * already existed and was correct — it was simply never reached. The 401 from
 * `POST /api/auth/jwt/create/` entered the response interceptor, which tried
 * to refresh, found no refresh token, and rejected with its own
 * «No refresh token available». That error, not the server's 401, is what
 * reached `extractErrorMessage`.
 *
 * The contract these tests pin has two halves, and both matter:
 *
 *   1. A 401 from the credential endpoints must surface the SERVER's error.
 *   2. A 401 from an ordinary endpoint must still drive the refresh path —
 *      the fix must not disable session recovery to fix the message.
 *
 * The real `apiClient` and its real interceptors are exercised here; only the
 * transport and the keychain are substituted. Asserting against a re-implemented
 * interceptor would prove nothing about the one that ships.
 */

const mockGetTokens = jest.fn(() => Promise.resolve(null as unknown));
const mockClearTokens = jest.fn(() => Promise.resolve());
const mockSaveTokens = jest.fn((_t: unknown) => Promise.resolve());

jest.mock('@utils/secureStorage', () => ({
  secureStorage: {
    getTokens: (...a: unknown[]) => mockGetTokens(...(a as [])),
    clearTokens: (...a: unknown[]) => mockClearTokens(...(a as [])),
    saveTokens: (...a: unknown[]) => mockSaveTokens(...(a as [unknown])),
  },
}));

import axios from 'axios';
import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import { extractErrorMessage } from '@utils/errorHandler';

/** The exact body djoser returns for a wrong username or password. */
const DJOSER_BAD_CREDENTIALS = {
  detail: 'No active account found with the given credentials',
};

const BAD_CREDENTIALS_FA = 'نام کاربری یا رمز عبور درست نیست.';
const STALE_SESSION_FA = 'نشستِ قبلی معتبر نیست. دوباره وارد شو.';

/**
 * Make the client answer every request with a 401 carrying `body`, and record
 * which URLs were attempted so we can tell a refresh attempt from a rejection.
 */
function stub401(body: unknown): { attempted: string[] } {
  const attempted: string[] = [];
  apiClient.defaults.adapter = ((config: { url?: string }) => {
    attempted.push(config.url ?? '');
    const err = new Error('Request failed with status code 401') as Error & {
      isAxiosError: boolean;
      response: unknown;
      config: unknown;
    };
    err.isAxiosError = true;
    err.config = config;
    err.response = { status: 401, data: body, headers: {}, config };
    return Promise.reject(err);
  }) as never;
  return { attempted };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetTokens.mockResolvedValue(null);
});

describe('a 401 from the credential endpoints is a verdict, not a stale session', () => {
  it('surfaces the server\'s own 401 for a wrong password on a fresh install', async () => {
    stub401(DJOSER_BAD_CREDENTIALS);

    const err = await apiClient
      .post(API_ENDPOINTS.AUTH_LOGIN, { username: 'someone', password: 'wrong' })
      .then(() => null)
      .catch((e: unknown) => e);

    // The rejection must carry the server's response, not the interceptor's
    // "No refresh token available" — that swap is the whole defect.
    expect((err as { response?: { status?: number } })?.response?.status).toBe(401);
    expect((err as Error).message).not.toMatch(/no refresh token/i);
  });

  it('tells the user their credentials were wrong, not that a session expired', async () => {
    stub401(DJOSER_BAD_CREDENTIALS);

    const err = await apiClient
      .post(API_ENDPOINTS.AUTH_LOGIN, { username: 'someone', password: 'wrong' })
      .then(() => null)
      .catch((e: unknown) => e);

    const message = extractErrorMessage(err);
    expect(message).toBe(BAD_CREDENTIALS_FA);
    expect(message).not.toBe(STALE_SESSION_FA);
  });

  it('never attempts a token refresh for a failed sign-in', async () => {
    const { attempted } = stub401(DJOSER_BAD_CREDENTIALS);

    await apiClient
      .post(API_ENDPOINTS.AUTH_LOGIN, { username: 'someone', password: 'wrong' })
      .catch(() => undefined);

    expect(attempted).toEqual([API_ENDPOINTS.AUTH_LOGIN]);
    // getTokens is read exactly once — by the REQUEST interceptor, which
    // attaches a Bearer header to every call. A refresh attempt would read it
    // a second time, so one call is the signature of "no refresh was tried".
    expect(mockGetTokens).toHaveBeenCalledTimes(1);
    // and a failed refresh clears the session — a signed-out user has none.
    expect(mockClearTokens).not.toHaveBeenCalled();
  });

  it('does not treat a 401 from the refresh endpoint as refreshable', async () => {
    const { attempted } = stub401({ detail: 'Token is invalid or expired' });

    await apiClient.post(API_ENDPOINTS.AUTH_REFRESH, { refresh: 'x' }).catch(() => undefined);

    expect(attempted).toEqual([API_ENDPOINTS.AUTH_REFRESH]);
    // Same signature as the sign-in case: one read, by the request
    // interceptor. Without the guard the refresh path runs and reads twice —
    // trying to refresh a token whose own refresh just came back 401.
    expect(mockGetTokens).toHaveBeenCalledTimes(1);
    expect(mockClearTokens).not.toHaveBeenCalled();
  });
});

describe('ordinary endpoints keep the refresh path', () => {
  it('still tries to refresh when a real request 401s', async () => {
    stub401({ detail: 'Given token not valid for any token type' });

    await apiClient.get(API_ENDPOINTS.USER_PROFILE).catch(() => undefined);

    // The fix must not disable session recovery. Twice: once in the request
    // interceptor, once in the refresh path — the second read is the one that
    // does not happen for a failed sign-in.
    expect(mockGetTokens).toHaveBeenCalledTimes(2);
  });

  it('reports an expired session when there is genuinely no refresh token', async () => {
    stub401({ detail: 'Given token not valid for any token type' });

    const err = await apiClient
      .get(API_ENDPOINTS.USER_PROFILE)
      .then(() => null)
      .catch((e: unknown) => e);

    // This is the message the login screen was wrongly borrowing. It is
    // correct *here*, where a session really did exist and has ended.
    expect(extractErrorMessage(err)).toBe(STALE_SESSION_FA);
    expect(mockClearTokens).toHaveBeenCalled();
  });
});

/**
 * Token rotation — the cause of the "logged out after a while" reports.
 *
 * The server runs simple-jwt with `ROTATE_REFRESH_TOKENS` and
 * `BLACKLIST_AFTER_ROTATION`. A refresh therefore returns a NEW refresh token
 * and blacklists the one that was presented — verified against the running
 * server, which answers a reused token with 401 «Token is blacklisted».
 *
 * The client used to save only `data.access`, leaving the dead refresh token
 * in the keychain. The first refresh worked, and the second — roughly half an
 * hour later — failed and signed the user out. A 30-day refresh lifetime was
 * in practice a one-hour session, which is exactly what users reported.
 *
 * This is invisible in a single-refresh test: the failure only appears on the
 * SECOND refresh. So the test below performs two.
 */
describe('a rotated refresh token is persisted, not discarded', () => {
  /** Serve one 401, then honour the retry — the shape of a real expiry. */
  function stubRotatingServer(opts: { rotate: boolean }) {
    const refreshCalls: string[] = [];
    let firstCall = true;

    // The refresh call is made with the bare `axios` instance, not with
    // `apiClient`, so both adapters have to be stubbed or the refresh escapes
    // the test entirely.
    const adapter = ((config: { url?: string; data?: string }) => {
      if (config.url?.includes(API_ENDPOINTS.AUTH_REFRESH)) {
        const presented = JSON.parse(config.data ?? '{}').refresh as string;
        refreshCalls.push(presented);
        // The server blacklists any token it has already been shown.
        if (refreshCalls.filter((t) => t === presented).length > 1) {
          const err = new Error('Request failed with status code 401') as Error & {
            isAxiosError: boolean; response: unknown; config: unknown;
          };
          err.isAxiosError = true;
          err.config = config;
          err.response = {
            status: 401,
            data: { detail: 'Token is blacklisted', code: 'token_not_valid' },
            headers: {}, config,
          };
          return Promise.reject(err);
        }
        const body: Record<string, string> = { access: `access-${refreshCalls.length}` };
        if (opts.rotate) { body.refresh = `refresh-${refreshCalls.length}`; }
        return Promise.resolve({ status: 200, data: body, headers: {}, config });
      }

      if (firstCall) {
        firstCall = false;
        const err = new Error('Request failed with status code 401') as Error & {
          isAxiosError: boolean; response: unknown; config: unknown;
        };
        err.isAxiosError = true;
        err.config = config;
        err.response = { status: 401, data: { detail: 'expired' }, headers: {}, config };
        return Promise.reject(err);
      }
      return Promise.resolve({ status: 200, data: { ok: true }, headers: {}, config });
    }) as never;

    apiClient.defaults.adapter = adapter;
    axios.defaults.adapter = adapter;

    return { refreshCalls, resetFirstCall: () => { firstCall = true; } };
  }

  it('saves the new refresh token the server hands back', async () => {
    mockGetTokens.mockResolvedValue({ accessToken: 'a0', refreshToken: 'refresh-0' });
    stubRotatingServer({ rotate: true });

    await apiClient.get('/api/wellness/').catch(() => undefined);

    // The whole defect in one assertion: what we persist must be the rotated
    // token, not the one we just spent.
    const saved = mockSaveTokens.mock.calls.at(-1)?.[0] as { refreshToken?: string };
    expect(saved?.refreshToken).toBe('refresh-1');
    expect(saved?.refreshToken).not.toBe('refresh-0');
  });

  it('survives a second expiry instead of signing the user out', async () => {
    let stored = { accessToken: 'a0', refreshToken: 'refresh-0' };
    mockGetTokens.mockImplementation(() => Promise.resolve(stored));
    mockSaveTokens.mockImplementation((t: unknown) => {
      stored = t as typeof stored;
      return Promise.resolve();
    });
    const server = stubRotatingServer({ rotate: true });

    await apiClient.get('/api/wellness/').catch(() => undefined);
    server.resetFirstCall();
    await apiClient.get('/api/wellness/').catch(() => undefined);

    // Two refreshes, each presenting a DIFFERENT token. Presenting the same
    // one twice is what the server blacklists, and what logged people out.
    expect(server.refreshCalls).toEqual(['refresh-0', 'refresh-1']);
    expect(new Set(server.refreshCalls).size).toBe(2);
    // The session must still be intact.
    expect(mockClearTokens).not.toHaveBeenCalled();
  });

  it('keeps the existing token if the server does not rotate', async () => {
    mockGetTokens.mockResolvedValue({ accessToken: 'a0', refreshToken: 'refresh-0' });
    stubRotatingServer({ rotate: false });

    await apiClient.get('/api/wellness/').catch(() => undefined);

    const saved = mockSaveTokens.mock.calls.at(-1)?.[0] as { refreshToken?: string };
    expect(saved?.refreshToken).toBe('refresh-0');
  });
});
