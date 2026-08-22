/**
 * The app's single React Query client.
 *
 * Extracted from App.tsx so that non-React code — specifically the auth
 * store — can clear the cache when the signed-in identity changes.
 *
 * Why that matters (F-05):
 *
 * No query key in this app is scoped by user: the profile lives at
 * `['profile']`, today's state at `['intelligence','today']`, and so on.
 * That is fine while one account is signed in, but `logout()` used to clear
 * only the tokens and the Zustand state, leaving every cached entry in
 * place. With `staleTime` at five minutes, the next account to sign in on
 * the same app session read the previous account's data straight out of the
 * cache and never issued a request at all.
 *
 * Observed on device before the fix: a partner signed in immediately after
 * the cycle owner and was shown the owner's name, the owner's cycle day and
 * predicted next period, the owner's accrual counts, and the full owner tab
 * bar — because `useProfile()` returned the owner's cached profile, so
 * `useRole()` resolved 'owner'. The server was never asked; no
 * `/api/user/profile/` request appears in the access log for that session.
 *
 * Clearing the cache at the identity boundary is the root fix. Scoping every
 * key by user id would also work but would touch every hook in the app and
 * still leave the previous user's data resident in memory.
 */
import { QueryClient } from '@tanstack/react-query';
import { QUERY_STALE_TIME_MS, QUERY_CACHE_TIME_MS } from '@constants/config';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME_MS,
      gcTime:    QUERY_CACHE_TIME_MS,
      retry: (failureCount, error: unknown) => {
        // Don't retry on 401/403/404
        const status = (error as { response?: { status: number } })?.response?.status;
        if (status === 401 || status === 403 || status === 404) { return false; }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Drop every cached response and every in-flight observer's data.
 *
 * Called whenever the signed-in identity changes — on sign-out and again on
 * sign-in, because a session can also be replaced without an explicit
 * sign-out (an expired refresh followed by a new login).
 *
 * `clear()` rather than `invalidateQueries()`: invalidation marks entries
 * stale but keeps serving them while refetching, which is exactly the
 * behaviour that showed one user another user's data.
 */
export function resetIdentityScopedCache(): void {
  queryClient.clear();
}
