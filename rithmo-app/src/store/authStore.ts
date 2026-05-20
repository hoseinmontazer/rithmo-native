import { create } from 'zustand';
import { authService } from '@api/services/authService';
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
