/**
 * useTTCStatus / useStartTTC / usePauseTTC / useEndTTC
 *
 * TTC (Trying To Conceive) Mode is a premium feature (P1.4.1) — the
 * status query is only enabled for an authenticated, premium user,
 * mirroring usePregnancy.ts exactly (a free user can never have TTC
 * data, since the backend gates the endpoint behind IsPremiumUser too;
 * skipping the request avoids a guaranteed 402/403).
 *
 * Every value in the response — status, cycles_trying, fertile_window,
 * cycle_summary — comes straight from the API. Nothing here recomputes
 * a date, a cycle count, or anything fertility-related; the backend
 * remains the single source of truth
 * (intelligence.services.ttc_status_payload).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ttcService } from '@api/services/ttcService';
import { queryKeys } from '@api/queryKeys';
import { useAuth } from '@hooks/useAuth';
import { usePremiumStatus } from '@hooks/queries/useSubscription';
import type { TTCActionRequest, TTCStatusPayload } from '@types/ttc.types';

export function useTTCStatus() {
  const { isAuthenticated } = useAuth();
  const { isPremium, isLoading: isPremiumLoading } = usePremiumStatus();

  return useQuery<TTCStatusPayload>({
    queryKey: queryKeys.ttc.status(),
    queryFn: () => ttcService.getStatus().then((r) => r.data.data),
    enabled: isAuthenticated && !isPremiumLoading && isPremium,
  });
}

function useTTCAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TTCActionRequest) =>
      ttcService.sendAction(payload).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ttc.all() });
    },
  });
}

export function useStartTTC() {
  const mutation = useTTCAction();
  return {
    ...mutation,
    mutate: (startedAt?: string) =>
      mutation.mutate(startedAt ? { action: 'start', started_at: startedAt } : { action: 'start' }),
    mutateAsync: (startedAt?: string) =>
      mutation.mutateAsync(startedAt ? { action: 'start', started_at: startedAt } : { action: 'start' }),
  };
}

export function usePauseTTC() {
  const mutation = useTTCAction();
  return {
    ...mutation,
    mutate: () => mutation.mutate({ action: 'pause' }),
    mutateAsync: () => mutation.mutateAsync({ action: 'pause' }),
  };
}

export function useEndTTC() {
  const mutation = useTTCAction();
  return {
    ...mutation,
    mutate: () => mutation.mutate({ action: 'end' }),
    mutateAsync: () => mutation.mutateAsync({ action: 'end' }),
  };
}
