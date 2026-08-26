/**
 * Identity isolation across account switches (F-05).
 *
 * The defect this protects against, reproduced on a physical device:
 *
 *   owner signs in  →  signs out  →  partner signs in (same app session)
 *   →  partner is shown the OWNER's name, cycle day, predicted next period,
 *      accrual counts, and the owner's five-tab shell.
 *
 * Mechanism: no React Query key in this app is scoped by user, and
 * `logout()` cleared only the tokens and the Zustand store. With a
 * five-minute `staleTime`, `useProfile()` served the departed owner's
 * cached profile to the arriving partner, `useRole()` read `user_role:
 * 'owner'` from it, and `MainNavigator` mounted the owner shell. The server
 * was never consulted — the access log for that session contains no
 * `/api/user/profile/` request at all.
 *
 * These tests pin the two things that must happen at every identity
 * boundary. They exercise the real `queryClient` and the real store, not
 * mocks of them, because the contract *is* "the cache is actually empty".
 */

const mockRemoveItem = jest.fn(() => Promise.resolve());
const mockSetItem = jest.fn(() => Promise.resolve());
const mockGetItem = jest.fn(() => Promise.resolve(null));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    removeItem: (...args: unknown[]) => mockRemoveItem(...(args as [])),
    setItem: (...args: unknown[]) => mockSetItem(...(args as [])),
    getItem: (...args: unknown[]) => mockGetItem(...(args as [])),
  },
}));

jest.mock('@utils/secureStorage', () => ({
  secureStorage: {
    clearTokens: jest.fn(() => Promise.resolve()),
    saveTokens: jest.fn(() => Promise.resolve()),
    getTokens: jest.fn(() => Promise.resolve(null)),
  },
}));

const mockLogin = jest.fn();
const mockGetMe = jest.fn();
jest.mock('@api/services/authService', () => ({
  authService: {
    login: (...args: unknown[]) => mockLogin(...(args as [])),
    getMe: (...args: unknown[]) => mockGetMe(...(args as [])),
  },
}));

jest.mock('@api/client', () => ({
  onSessionExpired: jest.fn(),
  apiClient: { interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } } },
}));

import { queryClient } from '@api/queryClient';
import { useAuthStore } from '@store/authStore';
import { ONBOARDING_ROLE_KEY } from '@hooks/useRole';
import { queryKeys } from '@api/queryKeys';

/** Seed the cache the way a signed-in cycle owner would have left it. */
function seedOwnerCache() {
  queryClient.setQueryData(queryKeys.profile.all(), {
    user_role: 'owner',
    sex: 'female',
    preferred_cycle_length: 28,
  });
  queryClient.setQueryData(queryKeys.intelligence.today(), {
    state: { evidence: { total_logs: 40 } },
  });
  queryClient.setQueryData(queryKeys.wellness.streaks(), { total_logs: 40 });
}

describe('identity state is cleared at every account boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('sign-out empties the React Query cache', async () => {
    seedOwnerCache();
    expect(queryClient.getQueryData(queryKeys.profile.all())).toBeDefined();

    await useAuthStore.getState().logout();

    // Not "marked stale" — gone. Invalidation keeps serving the old value
    // while refetching, which is the behaviour that leaked.
    expect(queryClient.getQueryData(queryKeys.profile.all())).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.intelligence.today())).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.wellness.streaks())).toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('sign-out removes the device-wide onboarding role', async () => {
    // `onboarding_role` is one key for the whole device, not one per account.
    // Left behind it becomes useRole()'s fallback for the NEXT account
    // whenever the profile request has not settled or has failed.
    await useAuthStore.getState().logout();
    expect(mockRemoveItem).toHaveBeenCalledWith(ONBOARDING_ROLE_KEY);
  });

  it('sign-in also clears, for sessions replaced without a sign-out', async () => {
    // An expired refresh followed by a fresh login never runs logout().
    seedOwnerCache();
    mockLogin.mockResolvedValue({ data: { access: 'a', refresh: 'r', user_id: '12' } });
    mockGetMe.mockResolvedValue({ data: { id: '12', username: 'partner' } });

    await useAuthStore.getState().login({ username: 'partner', password: 'x' } as never);

    expect(queryClient.getQueryData(queryKeys.profile.all())).toBeUndefined();
    expect(mockRemoveItem).toHaveBeenCalledWith(ONBOARDING_ROLE_KEY);
  });

  it('a failed session restore on boot also clears', async () => {
    // initialize() runs on every cold launch. Its catch branch cleared the
    // tokens but not the identity-scoped state, unlike login()/logout() —
    // so a profile (partner list included) fetched by a session that fails
    // this exact check stayed in the cache for the rest of the process.
    seedOwnerCache();
    const { secureStorage } = require('@utils/secureStorage');
    secureStorage.getTokens.mockResolvedValueOnce({ accessToken: 'stale' });
    mockGetMe.mockRejectedValueOnce(new Error('401'));

    await useAuthStore.getState().initialize();

    expect(queryClient.getQueryData(queryKeys.profile.all())).toBeUndefined();
    expect(mockRemoveItem).toHaveBeenCalledWith(ONBOARDING_ROLE_KEY);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('sign-out still completes if cache clearing throws', async () => {
    // A sign-out that throws would strand the user in an
    // authenticated-looking shell, which is worse than a stale cache.
    const spy = jest.spyOn(queryClient, 'clear').mockImplementation(() => {
      throw new Error('boom');
    });
    await expect(useAuthStore.getState().logout()).resolves.toBeUndefined();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    spy.mockRestore();
  });

  it('sign-out clears the authenticated identity itself', async () => {
    useAuthStore.setState({
      user: { id: '11', username: 'owner' } as never,
      userId: '11',
      partnerId: '12',
      isAuthenticated: true,
    });
    await useAuthStore.getState().logout();
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.userId).toBeNull();
    expect(s.partnerId).toBeNull();
    expect(s.isAuthenticated).toBe(false);
  });
});
