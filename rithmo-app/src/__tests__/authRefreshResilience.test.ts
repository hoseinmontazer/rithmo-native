/**
 * The API client's refresh path must only end a session the server rejected.
 *
 * When an access token expires (401) the client refreshes it. That refresh
 * used to clear the tokens and sign the user out on ANY failure, including a
 * refresh that simply could not reach the server. The real `apiClient` and its
 * real interceptors run here; only the transport and the keychain are
 * substituted (the same pattern as authErrorReporting.test.ts).
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
import { apiClient, onSessionExpired } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import { extractErrorMessage } from '@utils/errorHandler';

type Outcome = 'ok' | 'network' | 'timeout' | number;

function reject(config: unknown, outcome: Exclude<Outcome, 'ok'>) {
  const err = new Error(
    outcome === 'network' ? 'Network Error'
      : outcome === 'timeout' ? 'timeout of 15000ms exceeded'
        : `Request failed with status code ${outcome}`,
  ) as Error & { isAxiosError: boolean; config: unknown; response?: unknown; code?: string };
  err.isAxiosError = true;
  err.config = config;
  if (outcome === 'network') { err.code = 'ERR_NETWORK'; }
  else if (outcome === 'timeout') { err.code = 'ECONNABORTED'; }
  else { err.response = { status: outcome, data: { detail: 'x' }, headers: {}, config }; }
  return Promise.reject(err);
}

/**
 * Every ordinary request first gets a 401 (expired access token) until a
 * refresh succeeds; the refresh call answers with `refreshOutcome()`.
 */
function stubServer(refreshOutcome: () => Outcome) {
  let refreshed = false;
  const refreshCalls: number[] = [];
  const adapter = ((config: { url?: string }) => {
    if (config.url?.includes(API_ENDPOINTS.AUTH_REFRESH)) {
      refreshCalls.push(1);
      const outcome = refreshOutcome();
      if (outcome === 'ok') {
        refreshed = true;
        return Promise.resolve({ status: 200, data: { access: 'new-access', refresh: 'new-refresh' }, headers: {}, config });
      }
      return reject(config, outcome);
    }
    if (!refreshed) { return reject(config, 401); }
    return Promise.resolve({ status: 200, data: { ok: true }, headers: {}, config });
  }) as never;
  apiClient.defaults.adapter = adapter;
  axios.defaults.adapter = adapter;
  return { refreshCalls };
}

const expired = jest.fn();
onSessionExpired(expired);

beforeEach(() => {
  jest.clearAllMocks();
  mockGetTokens.mockResolvedValue({ accessToken: 'old-access', refreshToken: 'refresh-0' });
});

describe('a refresh that cannot reach the server keeps the session', () => {
  for (const outcome of ['network', 'timeout', 500, 502, 503] as const) {
    it(`does not clear tokens or end the session when the refresh fails with ${outcome}`, async () => {
      stubServer(() => outcome);

      const err = await apiClient.get('/api/wellness/').then(() => null).catch((e: unknown) => e);

      expect(err).not.toBeNull();
      expect(mockClearTokens).not.toHaveBeenCalled();
      expect(expired).not.toHaveBeenCalled();
      // The user is not told their session ended; that copy is for real expiries.
      expect(extractErrorMessage(err)).not.toBe('نشستِ قبلی معتبر نیست. دوباره وارد شو.');
    });
  }

  it('recovers on the next request once the server is reachable again', async () => {
    let online = false;
    const server = stubServer(() => (online ? 'ok' : 'network'));

    await apiClient.get('/api/wellness/').catch(() => undefined);
    expect(mockClearTokens).not.toHaveBeenCalled();

    online = true;
    const res = await apiClient.get('/api/wellness/');

    expect(res.status).toBe(200);
    expect(server.refreshCalls).toHaveLength(2);
    expect(mockClearTokens).not.toHaveBeenCalled();
    expect(expired).not.toHaveBeenCalled();
    const saved = mockSaveTokens.mock.calls.at(-1)?.[0] as { refreshToken?: string };
    expect(saved?.refreshToken).toBe('new-refresh');
  });
});

describe('a refresh the server rejects still ends the session', () => {
  for (const status of [400, 401, 403]) {
    it(`clears tokens and notifies the store on ${status}`, async () => {
      stubServer(() => status);

      await apiClient.get('/api/wellness/').catch(() => undefined);

      expect(mockClearTokens).toHaveBeenCalled();
      expect(expired).toHaveBeenCalledTimes(1);
    });
  }

  it('still ends the session when there is no refresh token at all', async () => {
    mockGetTokens.mockResolvedValue({ accessToken: 'old-access' });
    stubServer(() => 'ok');

    const err = await apiClient.get('/api/wellness/').then(() => null).catch((e: unknown) => e);

    expect(mockClearTokens).toHaveBeenCalled();
    expect(expired).toHaveBeenCalledTimes(1);
    expect(extractErrorMessage(err)).toBe('نشستِ قبلی معتبر نیست. دوباره وارد شو.');
  });
});

describe('a request that never reaches the server', () => {
  it('does not try to refresh or touch the session at all', async () => {
    const adapter = ((config: unknown) => reject(config, 'network')) as never;
    apiClient.defaults.adapter = adapter;
    axios.defaults.adapter = adapter;

    await apiClient.get(API_ENDPOINTS.USER_PROFILE).catch(() => undefined);

    expect(mockClearTokens).not.toHaveBeenCalled();
    expect(expired).not.toHaveBeenCalled();
  });
});
