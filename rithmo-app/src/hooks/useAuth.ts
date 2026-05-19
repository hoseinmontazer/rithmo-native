import { useAuthStore } from '@store/authStore';

/** Convenience hook — exposes only what screens need. */
export function useAuth() {
  const user            = useAuthStore((s) => s.user);
  const userId          = useAuthStore((s) => s.userId);
  const partnerId       = useAuthStore((s) => s.partnerId);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login           = useAuthStore((s) => s.login);
  const logout          = useAuthStore((s) => s.logout);
  const setPartnerId    = useAuthStore((s) => s.setPartnerId);

  return { user, userId, partnerId, isAuthenticated, login, logout, setPartnerId };
}
