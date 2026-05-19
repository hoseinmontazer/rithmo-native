import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@api/services/dashboardService';
import { queryKeys } from '@api/queryKeys';

export function useDashboardCorrelations() {
  return useQuery({
    queryKey: queryKeys.dashboard.correlations(),
    queryFn: () => dashboardService.getCorrelations().then((r) => r.data),
  });
}

export function useDashboardComparison() {
  return useQuery({
    queryKey: queryKeys.dashboard.comparison(),
    queryFn: () => dashboardService.getComparison().then((r) => r.data),
  });
}
