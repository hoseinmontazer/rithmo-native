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

export function useCycleAnalysis(role?: 'partner') {
  return useQuery({
    queryKey: queryKeys.periods.cycleAnalysis(role),
    queryFn: () => periodService.getCycleAnalysis(role).then((r) => r.data),
  });
}

export function useCycleInsights() {
  return useQuery({
    queryKey: queryKeys.periods.cycleInsights(),
    queryFn: () => periodService.getCycleInsights().then((r) => r.data),
  });
}

export function useSymptomPatterns() {
  return useQuery({
    queryKey: queryKeys.periods.symptomPatterns(),
    queryFn: () => periodService.getSymptomPatterns().then((r) => r.data),
  });
}

export function useLatestOvulation() {
  return useQuery({
    queryKey: queryKeys.ovulation.latest(),
    queryFn: () => periodService.getLatestOvulation().then((r) => r.data),
  });
}
