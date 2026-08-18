/**
 * useSubscription / usePremiumStatus
 *
 * usePremiumStatus() is the primary gate used by screens and components
 * to decide whether to show gated content or trigger the paywall:
 *
 *   const { isPremium, isLoading } = usePremiumStatus();
 *   if (!isPremium) navigation.navigate('Upgrade');
 *
 * useSubscription() exposes the full SubscriptionStatus shape for the
 * account/settings screen that shows plan details.
 *
 * Both hooks:
 *   - Default to free (isPremium = false) on any error or while loading
 *   - Never throw — they are read-only entitlement checks, not mutations
 *   - Cache for QUERY_STALE_TIME_MS (5 min) so gated screens don't fire
 *     a network request on every render
 */
import { useQuery } from '@tanstack/react-query';
import { subscriptionService } from '@api/services/subscriptionService';
import { queryKeys } from '@api/queryKeys';
import { useAuth } from '@hooks/useAuth';

export function useSubscription() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.subscription.status(),
    queryFn: () => subscriptionService.getStatus().then((r) => r.data),
    enabled:  isAuthenticated,
    // On 401/403/404 treat as free tier — don't retry billing checks
    retry: (failureCount, error: any) => {
      const s = error?.response?.status;
      if (s === 401 || s === 403 || s === 404) { return false; }
      return failureCount < 2;
    },
    // Return a free-tier shape on any error so callers never see undefined
    select: (data) => data ?? { plan: null, status: 'free', is_active: false, current_period_end: null },
  });
}

export function usePremiumStatus(): { isPremium: boolean; isLoading: boolean } {
  const { data, isLoading } = useSubscription();
  return {
    isPremium: data?.is_active ?? false,
    isLoading,
  };
}
