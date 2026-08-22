import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { periodService } from '@api/services/periodService';
import { queryKeys } from '@api/queryKeys';
import type { CreatePeriodRequest, UpdatePeriodRequest } from '@types/period.types';

export function usePeriods(role?: 'partner') {
  return useQuery({
    queryKey: queryKeys.periods.list(role),
    queryFn: () => periodService.listPeriods(role).then((r) => r.data),
  });
}

export function usePeriod(id: number) {
  return useQuery({
    queryKey: queryKeys.periods.detail(id),
    queryFn: () => periodService.getPeriod(id).then((r) => r.data),
    enabled: id > 0,
  });
}

export function useCreatePeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePeriodRequest) =>
      periodService.createPeriod(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.periods.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.ovulation.latest() });
      // A period changes cycle context, phase, predictions and the observed
      // cycle count in the accrual ledger — all of which Home reads from
      // the intelligence layer.
      queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.all() });
    },
  });
}

export function useUpdatePeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePeriodRequest }) =>
      periodService.updatePeriod(id, data).then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.periods.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.periods.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.all() });
    },
  });
}

export function usePatchPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UpdatePeriodRequest> }) =>
      periodService.patchPeriod(id, data).then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.periods.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.periods.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.all() });
    },
  });
}

export function useDeletePeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => periodService.deletePeriod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.periods.all() });
    },
  });
}

export function useCycleAnalysis(role?: 'partner'): ReturnType<typeof useQuery>;
export function useCycleAnalysis(options?: { role?: 'partner'; enabled?: boolean }): ReturnType<typeof useQuery>;
export function useCycleAnalysis(roleOrOptions?: 'partner' | { role?: 'partner'; enabled?: boolean }) {
  // Handle both old and new API
  const role = typeof roleOrOptions === 'string' ? roleOrOptions : roleOrOptions?.role;
  const enabled = typeof roleOrOptions === 'object' ? roleOrOptions?.enabled ?? true : true;

  return useQuery({
    queryKey: queryKeys.periods.cycleAnalysis(role),
    queryFn: async () => {
      try {
        const response = await periodService.getCycleAnalysis(role);
        // Handle wrapped response format: { status, data, view_type }
        const apiData = response.data;
        if (apiData && typeof apiData === 'object' && 'data' in apiData) {
          return (apiData as any).data;
        }
        return apiData;
      } catch (error: any) {
        // 404 means no cycle data yet - this is normal, not an error
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      // Don't retry on 404 - it means no data exists
      if (error?.response?.status === 404) {return false;}
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
  });
}

export function useCycleInsights() {
  return useQuery({
    queryKey: queryKeys.periods.cycleInsights(),
    queryFn: async () => {
      try {
        const response = await periodService.getCycleInsights();
        const apiData = response.data;
        if (apiData && typeof apiData === 'object' && 'data' in apiData) {
          return (apiData as any).data;
        }
        return apiData;
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) {return false;}
      return failureCount < 2;
    },
  });
}

export function useSymptomPatterns() {
  return useQuery({
    queryKey: queryKeys.periods.symptomPatterns(),
    queryFn: async () => {
      try {
        const response = await periodService.getSymptomPatterns();
        const apiData = response.data;
        if (apiData && typeof apiData === 'object' && 'data' in apiData) {
          return (apiData as any).data;
        }
        return apiData;
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) {return false;}
      return failureCount < 2;
    },
  });
}

export function useLatestOvulation(options?: { enabled?: boolean }) {
  const { enabled = true } = options ?? {};
  return useQuery({
    queryKey: queryKeys.ovulation.latest(),
    queryFn: async () => {
      try {
        const response = await periodService.getLatestOvulation();
        // The backend wraps this as { status, data: { ovulation_date, ... } }
        // — OvulationScreen reads fields straight off the returned value
        // (data.ovulation_date, not data.data.ovulation_date), so unwrap
        // here rather than at every call site.
        const body = response.data as any;
        return (body && typeof body === 'object' && 'data' in body) ? body.data : body;
      } catch (error: any) {
        // 404 means no ovulation data yet
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) {return false;}
      return failureCount < 2;
    },
    enabled,
  });
}

/**
 * useAnalyticsCycle — fetches from /api/analytics/cycle/
 * Returns partner_name/partner_id + insights + analysis for male users,
 * and insights + analysis for female users.
 */
export function useAnalyticsCycle(options?: {
  role?: 'partner';
  mode?: 'analysis';
  enabled?: boolean;
}) {
  const { role, mode, enabled = true } = options ?? {};
  return useQuery({
    queryKey: queryKeys.periods.analyticsCycle(role, mode),
    queryFn: async () => {
      try {
        const response = await periodService.getAnalyticsCycle({ role, mode });
        const apiData = response.data;
        // Unwrap { status, data } if present
        if (apiData && typeof apiData === 'object' && 'data' in apiData) {
          return (apiData as any).data;
        }
        return apiData;
      } catch (error: any) {
        if (error?.response?.status === 403 || error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 403 || error?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}
