/**
 * Session restore on a cold start must tell "the server rejected this session"
 * apart from "the server could not be reached".
 *
 * The defect, reproduced on a device: an offline cold start cleared the saved
 * tokens and showed the login screen, and the user stayed signed out after the
 * network came back. Any failure of the restore check was treated as an
 * invalid session.
 *
 * The real store runs here; only the keychain, the network service and the
 * API client module are substituted (the same pattern as identityIsolation).
 */

const mockRemoveItem = jest.fn(() => Promise.resolve());
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    removeItem: (...args: unknown[]) => mockRemoveItem(...(args as [])),
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
  },
}));

const mockGetTokens = jest.fn();
const mockClearTokens = jest.fn(() => Promise.resolve());
jest.mock('@utils/secureStorage', () => ({
  secureStorage: {
    getTokens: (...a: unknown[]) => mockGetTokens(...(a as [])),
    clearTokens: (...a: unknown[]) => mockClearTokens(...(a as [])),
    saveTokens: jest.fn(() => Promise.resolve()),
  },
}));

const mockGetMe = jest.fn();
jest.mock('@api/services/authService', () => ({
  authService: {
    login: jest.fn(),
    getMe: (...args: unknown[]) => mockGetMe(...(args as [])),
  },
}));

jest.mock('@utils/pushTokenCleanup', () => ({
  deregisterPushTokenBestEffort: jest.fn(() => Promise.resolve()),
}));

jest.mock('@api/client', () => ({
  onSessionExpired: jest.fn(),
  apiClient: { interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } } },
}));

import { useAuthStore } from '@store/authStore';
import { ONBOARDING_ROLE_KEY } from '@hooks/useRole';
import {
  MISSING_REFRESH_TOKEN_MESSAGE, MissingRefreshTokenError, isTerminalAuthRejection,
} from '@api/authErrors';

const SAVED = { accessToken: 'access', refreshToken: 'refresh', userId: '12' };
const USER = { id: '12', username: 'owner' };

/** Axios shapes, as the real client rejects them. */
const networkError = () => Object.assign(new Error('Network Error'), { isAxiosError: true, code: 'ERR_NETWORK' });
const timeoutError = () => Object.assign(new Error('timeout of 15000ms exceeded'), { isAxiosError: true, code: 'ECONNABORTED' });
const httpError = (status: number) => Object.assign(new Error(`Request failed with status code ${status}`), {
  isAxiosError: true,
  response: { status, data: {} },
});

function resetStore() {
  useAuthStore.setState({
    user: null, userId: null, partnerId: null,
    isAuthenticated: false, sessionVerified: false, isInitializing: true,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
  mockGetTokens.mockResolvedValue(SAVED);
});

describe('classifying a failed session check', () => {
  it('treats a server rejection as terminal', () => {
    expect(isTerminalAuthRejection(httpError(401))).toBe(true);
    expect(isTerminalAuthRejection(httpError(403))).toBe(true);
    expect(isTerminalAuthRejection(new MissingRefreshTokenError())).toBe(true);
  });

  it('treats an unreachable or failing server as temporary', () => {
    for (const e of [networkError(), timeoutError(), httpError(500), httpError(502), httpError(503), httpError(408), httpError(429)]) {
      expect(isTerminalAuthRejection(e)).toBe(false);
    }
    expect(isTerminalAuthRejection(new Error('anything'))).toBe(false);
    expect(isTerminalAuthRejection(null)).toBe(false);
  });

  it('also treats a 400 from the refresh call as terminal, but not from other calls', () => {
    expect(isTerminalAuthRejection(httpError(400), { refreshRequest: true })).toBe(true);
    expect(isTerminalAuthRejection(httpError(400))).toBe(false);
    expect(isTerminalAuthRejection(httpError(503), { refreshRequest: true })).toBe(false);
    expect(isTerminalAuthRejection(networkError(), { refreshRequest: true })).toBe(false);
  });

  it('keeps the existing message for a missing refresh token', () => {
    const e = new MissingRefreshTokenError();
    expect(e.message).toBe(MISSING_REFRESH_TOKEN_MESSAGE);
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(MissingRefreshTokenError);
  });
});

describe('cold start when the server cannot be reached', () => {
  for (const [name, make] of [
    ['offline (network error)', networkError],
    ['a request timeout', timeoutError],
    ['a server error (503)', () => httpError(503)],
    ['a server error (500)', () => httpError(500)],
  ] as const) {
    it(`keeps the saved session on ${name}`, async () => {
      mockGetMe.mockRejectedValueOnce(make());

      await useAuthStore.getState().initialize();

      const s = useAuthStore.getState();
      expect(mockClearTokens).not.toHaveBeenCalled();
      expect(mockRemoveItem).not.toHaveBeenCalledWith(ONBOARDING_ROLE_KEY);
      expect(s.isAuthenticated).toBe(true);
      // Signed in on saved tokens, but not claimed verified by the server.
      expect(s.sessionVerified).toBe(false);
      expect(s.user).toBeNull();
      expect(s.userId).toBe('12');
      expect(s.isInitializing).toBe(false);
    });
  }
});

describe('cold start when the server rejects the session', () => {
  for (const status of [401, 403]) {
    it(`signs out and clears identity state on ${status}`, async () => {
      mockGetMe.mockRejectedValueOnce(httpError(status));

      await useAuthStore.getState().initialize();

      const s = useAuthStore.getState();
      expect(mockClearTokens).toHaveBeenCalled();
      expect(mockRemoveItem).toHaveBeenCalledWith(ONBOARDING_ROLE_KEY);
      expect(s.isAuthenticated).toBe(false);
      expect(s.sessionVerified).toBe(false);
    });
  }

  it('signs out when the refresh behind the check found no refresh token', async () => {
    mockGetMe.mockRejectedValueOnce(new MissingRefreshTokenError());
    await useAuthStore.getState().initialize();
    expect(mockClearTokens).toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('still shows login when the saved tokens cannot even be read', async () => {
    mockGetTokens.mockRejectedValueOnce(new Error('keychain unavailable'));
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('a normal cold start', () => {
  it('marks the session verified', async () => {
    mockGetMe.mockResolvedValueOnce({ data: USER });
    await useAuthStore.getState().initialize();
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.sessionVerified).toBe(true);
    expect(s.user).toEqual(USER);
  });

  it('with no saved session shows login without touching the keychain', async () => {
    mockGetTokens.mockResolvedValueOnce(null);
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(mockGetMe).not.toHaveBeenCalled();
    expect(mockClearTokens).not.toHaveBeenCalled();
  });
});

describe('recovering after an offline start', () => {
  async function startOffline() {
    mockGetMe.mockRejectedValueOnce(networkError());
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().sessionVerified).toBe(false);
  }

  it('verifies the session once the server is reachable again', async () => {
    await startOffline();
    mockGetMe.mockResolvedValueOnce({ data: USER });

    await useAuthStore.getState().revalidateSession();

    const s = useAuthStore.getState();
    expect(s.sessionVerified).toBe(true);
    expect(s.user).toEqual(USER);
    expect(s.isAuthenticated).toBe(true);
    expect(mockClearTokens).not.toHaveBeenCalled();
  });

  it('stays signed in (unverified) while the server is still unreachable', async () => {
    await startOffline();
    mockGetMe.mockRejectedValueOnce(timeoutError());

    await useAuthStore.getState().revalidateSession();

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().sessionVerified).toBe(false);
    expect(mockClearTokens).not.toHaveBeenCalled();
  });

  it('signs out properly if the server, once reachable, rejects the session', async () => {
    await startOffline();
    mockGetMe.mockRejectedValueOnce(httpError(401));

    await useAuthStore.getState().revalidateSession();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(mockClearTokens).toHaveBeenCalled();
    expect(mockRemoveItem).toHaveBeenCalledWith(ONBOARDING_ROLE_KEY);
  });

  it('does nothing for a session that is already verified or signed out', async () => {
    useAuthStore.setState({ isAuthenticated: true, sessionVerified: true });
    await useAuthStore.getState().revalidateSession();
    useAuthStore.setState({ isAuthenticated: false, sessionVerified: false });
    await useAuthStore.getState().revalidateSession();
    expect(mockGetMe).not.toHaveBeenCalled();
  });
});
