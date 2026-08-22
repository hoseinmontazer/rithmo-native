import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetIdentityScopedCache } from '@api/queryClient';
import { ONBOARDING_ROLE_KEY } from '@hooks/useRole';
import { authService } from '@api/services/authService';
import { onSessionExpired } from '@api/client';
import { secureStorage } from '@utils/secureStorage';
import type { AuthUser, LoginRequest, StoredTokens } from '@types/auth.types';

interface AuthState {
  user: AuthUser | null;
  userId: string | null;
  partnerId: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;

  // Actions
  initialize: () => Promise<void>;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  setPartnerId: (id: string | null) => void;
}


/**
 * Wipe every piece of client state that belongs to one signed-in identity.
 *
 * Called on sign-out and again on sign-in. Two things live outside the
 * Zustand store and both leaked across accounts before F-05:
 *
 *  1. **The React Query cache.** No query key in this app is scoped by user,
 *     so `['profile']`, `['intelligence','today']` and friends were reused by
 *     whoever signed in next. With a five-minute `staleTime` the new account
 *     read the previous account's data out of the cache and issued no request
 *     at all. On device, a partner signing in after the cycle owner was shown
 *     the owner's name, cycle day, predicted next period and accrual counts,
 *     and got the owner's tab bar — because `useProfile()` returned the
 *     owner's cached profile, so `useRole()` resolved 'owner'.
 *
 *  2. **The device-local onboarding role.** `onboarding_role` is a single
 *     device-wide AsyncStorage key, not a per-account one. Left behind, it
 *     is `useRole()`'s fallback whenever the profile request has not settled
 *     or has failed — so the previous account's role could decide the app
 *     shell for the next one.
 *
 * Both failures are non-fatal to clear, so neither is allowed to block
 * sign-out: a sign-out that throws would strand the user in an
 * authenticated-looking shell.
 */
async function clearIdentityState(): Promise<void> {
  try {
    resetIdentityScopedCache();
  } catch {
    // Cache clearing must never block the identity transition.
  }
  try {
    await AsyncStorage.removeItem(ONBOARDING_ROLE_KEY);
  } catch {
    // Storage unavailable — the server profile still decides the role.
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userId: null,
  partnerId: null,
  isAuthenticated: false,
  isInitializing: true,

  /**
   * Called once on app boot — restores session from secure storage.
   */
  initialize: async () => {
    try {
      const tokens = await secureStorage.getTokens();
      if (!tokens?.accessToken) {
        set({ isInitializing: false, isAuthenticated: false });
        return;
      }

      // Validate token by fetching current user
      const { data: user } = await authService.getMe();
      set({
        user,
        userId: tokens.userId ?? user.id,
        isAuthenticated: true,
        isInitializing: false,
      });
    } catch (error) {
      // Token invalid or expired and refresh failed — clear and show login
      try {
        await secureStorage.clearTokens();
      } catch (clearError) {
        // Ignore clear errors
      }
      set({ isInitializing: false, isAuthenticated: false });
    }
  },

  login: async (credentials: LoginRequest) => {
    const { data } = await authService.login(credentials);

    // Before the incoming identity issues a single request. A session can be
    // replaced without an explicit sign-out (an expired refresh followed by a
    // fresh login), and in that path logout() never ran.
    await clearIdentityState();

    const tokens: StoredTokens = {
      accessToken: data.access,
      refreshToken: data.refresh,
      userId: data.user_id,
    };
    await secureStorage.saveTokens(tokens);

    const { data: user } = await authService.getMe();
    set({
      user,
      userId: data.user_id ?? user.id,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    await secureStorage.clearTokens();
    // Everything tied to the departing identity goes with the tokens.
    // See clearIdentityState() for why this is not optional.
    await clearIdentityState();
    set({
      user: null,
      userId: null,
      partnerId: null,
      isAuthenticated: false,
    });
  },

  setUser: (user: AuthUser) => set({ user }),

  setPartnerId: (id: string | null) => set({ partnerId: id }),
}));

// When the API client's token refresh definitively fails, log out so
// RootNavigator redirects to the auth screens instead of leaving the app
// in an authenticated-but-tokenless state (audit 2026-08-20, finding F5).
onSessionExpired(() => {
  useAuthStore.getState().logout().catch(() => {
    // best-effort: state is cleared inside logout()
  });
});
