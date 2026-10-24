/**
 * PRIVATE contraception records, reminders and sexual-health check dates.
 *
 * Own query keys (never under `profile`), cleared on logout with the rest of
 * the cache. Mutations never write a guess into the cache: they refetch, so a
 * screen only ever shows what the server confirmed.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reproductiveRecordsService as api } from '@api/services/reproductiveRecordsService';
import { queryKeys } from '@api/queryKeys';
import { useAuth } from '@hooks/useAuth';
import type {
  ContraceptionReminder,
  ContraceptionSummary,
  CreateCheckRequest,
  CreateRecordRequest,
  CreateReminderRequest,
  SexualHealthCheck,
} from '@types/reproductiveRecords.types';

export function useContraceptionSummary() {
  const { isAuthenticated } = useAuth();
  return useQuery<ContraceptionSummary>({
    queryKey: queryKeys.contraception.summary(),
    queryFn: () => api.getSummary().then((r) => r.data.data),
    enabled: isAuthenticated,
  });
}

export function useContraceptionReminders() {
  const { isAuthenticated } = useAuth();
  return useQuery<ContraceptionReminder[]>({
    queryKey: queryKeys.contraception.reminders(),
    queryFn: () => api.getReminders().then((r) => r.data.data),
    enabled: isAuthenticated,
  });
}

export function useSexualHealthChecks() {
  const { isAuthenticated } = useAuth();
  return useQuery<SexualHealthCheck[]>({
    queryKey: queryKeys.sexualHealth.checks(),
    queryFn: () => api.getChecks().then((r) => r.data.data),
    enabled: isAuthenticated,
  });
}

/** Records and reminders affect each other (stopping a method switches its
 *  reminders off), and the fertile-window note depends on the method. */
function useRefreshContraception() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.contraception.summary() });
    qc.invalidateQueries({ queryKey: queryKeys.contraception.reminders() });
    qc.invalidateQueries({ queryKey: queryKeys.intelligence.all() });
  };
}

export function useCreateRecord() {
  const refresh = useRefreshContraception();
  return useMutation({
    mutationFn: (b: CreateRecordRequest) => api.createRecord(b).then((r) => r.data.data),
    onSuccess: refresh,
  });
}

export function useUpdateRecord() {
  const refresh = useRefreshContraception();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; started_on?: string; stopped_on?: string | null }) =>
      api.updateRecord(id, body).then((r) => r.data.data),
    onSuccess: refresh,
  });
}

export function useDeleteRecord() {
  const refresh = useRefreshContraception();
  return useMutation({
    mutationFn: (id: number) => api.deleteRecord(id).then((r) => r.data),
    onSuccess: refresh,
  });
}

export function useCreateReminder() {
  const refresh = useRefreshContraception();
  return useMutation({
    mutationFn: (b: CreateReminderRequest) => api.createReminder(b).then((r) => r.data.data),
    onSuccess: refresh,
  });
}

export function useUpdateReminder() {
  const refresh = useRefreshContraception();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; is_active?: boolean }) =>
      api.updateReminder(id, body).then((r) => r.data.data),
    onSuccess: refresh,
  });
}

export function useDeleteReminder() {
  const refresh = useRefreshContraception();
  return useMutation({
    mutationFn: (id: number) => api.deleteReminder(id).then((r) => r.data),
    onSuccess: refresh,
  });
}

export function useCreateCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CreateCheckRequest) => api.createCheck(b).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sexualHealth.checks() }),
  });
}

export function useDeleteCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteCheck(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sexualHealth.checks() }),
  });
}
