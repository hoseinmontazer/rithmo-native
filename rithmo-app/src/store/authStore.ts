import { create } from 'zustand';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetIdentityScopedCache } from '@api/queryClient';
import { ONBOARDING_ROLE_KEY } from '@hooks/useRole';
import { authService } from '@api/services/authService';
import { onSessionExpired } from '@api/client';
import { isTerminalAuthRejection } from '@api/authErrors';
import { secureStorage } from '@utils/secureStorage';
import { deregisterPushTokenBestEffort } from '@utils/pushTokenCleanup';
import type { AuthUser, LoginRequest, StoredTokens } from '@types/auth.types';

interface AuthState {
  user: AuthUser | null;
  userId: string | null;
  partnerId: string | null;
  isAuthenticated: boolean;
  /**
   * Whether the server has confirmed this session since launch. False while
   * signed in on saved tokens that could not be checked (offline, timeout,
   * outage): the user keeps their session, but it is not claimed verified.
   */
  sessionVerified: boolean;
  isInitializing: boolean;

  // Actions
  initialize: () => Promise<void>;
  /** Re-check an unverified session with the server (no-op otherwise). */
  revalidateSession: () => Promise<void>;
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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userId: null,
  partnerId: null,
  isAuthenticated: false,
  sessionVerified: false,
  isInitializing: true,

  /**
   * Called once on app boot — restores session from secure storage.
   */
  initialize: async () => {
    let tokens: StoredTokens | null = null;
    try {
      tokens = await secureStorage.getTokens();
      if (!tokens?.accessToken) {
        set({ isInitializing: false, isAuthenticated: false, sessionVerified: false });
        return;
      }

      // Validate token by fetching current user
      const { data: user } = await authService.getMe();
      set({
        user,
        userId: tokens.userId ?? user.id,
        isAuthenticated: true,
        sessionVerified: true,
        isInitializing: false,
      });
    } catch (error) {
      // The server could not be reached (offline, timeout, outage): the saved
      // session is unverified, not invalid. Keep the tokens and the identity
      // so the user is not signed out by a bad connection; the API client's
      // own 401 -> refresh path still ends the session if the server rejects
      // it once it is reachable, and revalidateSession() fills in the user.
      if (tokens?.accessToken && !isTerminalAuthRejection(error)) {
        set({
          userId: tokens.userId ?? null,
          isAuthenticated: true,
          sessionVerified: false,
          isInitializing: false,
        });
        return;
      }

      // The server rejected the session (or the tokens could not be read):
      // clear and show login.
      // Must also clear identity-scoped state, exactly like login()/logout():
      // without it, a profile (including partner data) fetched by a session
      // that fails this exact check stays in the in-memory React Query cache
      // for the rest of the process, and would be served to whichever
      // account signs in next if that account's own fetch is ever slow to
      // resolve.
      try {
        await secureStorage.clearTokens();
      } catch (clearError) {
        // Ignore clear errors
      }
      await clearIdentityState();
      set({ isInitializing: false, isAuthenticated: false, sessionVerified: false });
    }
  },

  revalidateSession: async () => {
    const { isAuthenticated, sessionVerified } = get();
    if (!isAuthenticated || sessionVerified) { return; }
    try {
      const { data: user } = await authService.getMe();
      set({ user, userId: get().userId ?? user.id, sessionVerified: true });
    } catch (error) {
      // Still unreachable: stay signed in, still unverified. A rejection the
      // API client has not already handled ends the session the usual way.
      if (isTerminalAuthRejection(error) && get().isAuthenticated) {
        await get().logout();
      }
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
      sessionVerified: true,
    });
  },

  logout: async () => {
    // While the session is still valid: stop pushes to this device for the
    // departing account. Best effort and time-boxed; never blocks sign-out.
    await deregisterPushTokenBestEffort();
    await secureStorage.clearTokens();
    // Everything tied to the departing identity goes with the tokens.
    // See clearIdentityState() for why this is not optional.
    await clearIdentityState();
    set({
      user: null,
      userId: null,
      partnerId: null,
      isAuthenticated: false,
      sessionVerified: false,
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

// Recovery after a launch that could not reach the server: when the app comes
// back to the foreground, check the unverified session once. Event-driven, not
// a retry loop; does nothing for a verified or signed-out session. (AppState is
// absent in the logic-test environment, hence the guard.)
AppState?.addEventListener?.('change', (status) => {
  if (status === 'active') {
    useAuthStore.getState().revalidateSession().catch(() => {
      // best-effort: a failure leaves the session unverified, never signed out
    });
  }
});
