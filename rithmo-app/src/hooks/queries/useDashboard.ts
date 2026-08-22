import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@api/services/dashboardService';
import { queryKeys } from '@api/queryKeys';
import { usePremiumStatus } from '@hooks/queries/useSubscription';

// Gate the queries on entitlement: /api/dashboard/* returns 403 for free
// users (IsPremiumUser). With `enabled: isPremium`, free users no longer
// fire an un-gated 403 burst on every mount of a gated screen; premium
// screens fetch once entitlement is confirmed.
export function useDashboardCorrelations() {
  const { isPremium } = usePremiumStatus();
  return useQuery({
    queryKey: queryKeys.dashboard.correlations(),
    queryFn: () => dashboardService.getCorrelations().then((r) => r.data),
    enabled: isPremium,
  });
}

export function useDashboardComparison() {
  const { isPremium } = usePremiumStatus();
  return useQuery({
    queryKey: queryKeys.dashboard.comparison(),
    queryFn: () => dashboardService.getComparison().then((r) => r.data),
    enabled: isPremium,
  });
}
