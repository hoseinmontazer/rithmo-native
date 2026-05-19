import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wellnessService } from '@api/services/wellnessService';
import { queryKeys } from '@api/queryKeys';
import type {
  WellnessLog,
  WellnessAnalytics,
  WellnessStreaks,
  CreateWellnessLogRequest,
  UpdateWellnessLogRequest,
} from '@types/wellness.types';

export function useWellnessLogs() {
  return useQuery<WellnessLog[]>({
    queryKey: queryKeys.wellness.all(),
    queryFn: () => wellnessService.listLogs(),
  });
}

export function useWellnessLog(id: number) {
  return useQuery<WellnessLog>({
    queryKey: queryKeys.wellness.detail(id),
    queryFn: () => wellnessService.getLog(id),
    enabled: id > 0,
  });
}

export function useCreateOrUpdateWellnessLog() {
  const queryClient = useQueryClient();
  return useMutation<WellnessLog, Error, CreateWellnessLogRequest>({
    mutationFn: (data) => wellnessService.createOrUpdateLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wellness.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.wellness.today() });
      queryClient.invalidateQueries({ queryKey: queryKeys.wellness.streaks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.wellness.analytics(30) });
    },
  });
}

export function useUpdateWellnessLog() {
  const queryClient = useQueryClient();
  return useMutation<WellnessLog, Error, { id: number; data: UpdateWellnessLogRequest }>({
    mutationFn: ({ id, data }) => wellnessService.updateLog(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.wellness.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.wellness.all() });
    },
  });
}

export function useDeleteWellnessLog() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => wellnessService.deleteLog(id).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wellness.all() });
    },
  });
}

export function useWellnessAnalytics(days: number = 30) {
  return useQuery<WellnessAnalytics | null>({
    queryKey: queryKeys.wellness.analytics(days),
    queryFn: () => wellnessService.getAnalytics(days),
  });
}

export function useWellnessStreaks() {
  return useQuery<WellnessStreaks | null>({
    queryKey: queryKeys.wellness.streaks(),
    queryFn: () => wellnessService.getStreaks(),
  });
}

export function useTodayWellnessLog() {
  return useQuery<WellnessLog | null>({
    queryKey: queryKeys.wellness.today(),
    queryFn: () => wellnessService.getTodayLog(),
  });
}

export function useWeeklySummary() {
  return useQuery<unknown>({
    queryKey: queryKeys.wellness.weeklySummary(),
    queryFn: () => wellnessService.getWeeklySummary(),
  });
}
