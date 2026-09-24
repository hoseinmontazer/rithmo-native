/**
 * Today 2.0 contextual events — free for every user, independent of
 * WellnessLog's cache (see useCreateOrUpdateWellnessLog for why that one
 * also invalidates queryKeys.intelligence.all(); this hook mirrors the
 * same reasoning: a context tag changes what PersonalState.today_context
 * reports, so the intelligence cache must invalidate here too).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contextEntryService } from '@api/services/contextEntryService';
import { queryKeys } from '@api/queryKeys';
import type {
  ContextEntry,
  CreateContextEntryRequest,
  UpdateContextEntryRequest,
} from '@types/contextEntry.types';

export function useContextEntriesForDate(date: string) {
  return useQuery<ContextEntry[]>({
    queryKey: queryKeys.contextEntries.byDate(date),
    queryFn: () => contextEntryService.listByDate(date),
    enabled: Boolean(date),
  });
}

function invalidateContextCaches(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.contextEntries.all() });
  queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.all() });
}

export function useCreateContextEntry() {
  const queryClient = useQueryClient();
  return useMutation<ContextEntry, Error, CreateContextEntryRequest>({
    mutationFn: (data) => contextEntryService.create(data),
    onSuccess: () => invalidateContextCaches(queryClient),
  });
}

export function useUpdateContextEntry() {
  const queryClient = useQueryClient();
  return useMutation<ContextEntry, Error, { id: number; data: UpdateContextEntryRequest }>({
    mutationFn: ({ id, data }) => contextEntryService.update(id, data),
    onSuccess: () => invalidateContextCaches(queryClient),
  });
}

export function useDeleteContextEntry() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => contextEntryService.delete(id).then(() => undefined),
    onSuccess: () => invalidateContextCaches(queryClient),
  });
}
