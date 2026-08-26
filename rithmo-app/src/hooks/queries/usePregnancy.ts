/**
 * usePregnancyStatus / useStartPregnancy / useEndPregnancy
 *
 * Pregnancy is a premium feature — the status query is only enabled for an
 * authenticated, premium user (a free user can never have an active
 * pregnancy, since the backend gates creation behind IsPremiumUser too;
 * skipping the request avoids a guaranteed 402/403 on every Home render).
 *
 * All gestational-week/day/trimester/due-date values come straight from
 * the API response — nothing here recomputes them. The backend remains
 * the single source of truth (cycle_tracker.services.pregnancy_service).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pregnancyService } from '@api/services/pregnancyService';
import { queryKeys } from '@api/queryKeys';
import { useAuth } from '@hooks/useAuth';
import { usePremiumStatus } from '@hooks/queries/useSubscription';
import type { PregnancyStatus, StartPregnancyRequest } from '@types/pregnancy.types';

/** Handles both the {status,data} envelope and a bare payload, matching
 *  the defensive-unwrap pattern already used by usePeriods.ts. */
function unwrap(responseData: unknown): PregnancyStatus {
  if (responseData && typeof responseData === 'object' && 'data' in (responseData as any)) {
    return (responseData as any).data;
  }
  return responseData as PregnancyStatus;
}

export function usePregnancyStatus() {
  const { isAuthenticated } = useAuth();
  const { isPremium, isLoading: isPremiumLoading } = usePremiumStatus();

  return useQuery({
    queryKey: queryKeys.pregnancy.status(),
    queryFn: () => pregnancyService.getStatus().then((r) => unwrap(r.data)),
    enabled: isAuthenticated && !isPremiumLoading && isPremium,
  });
}

export function useStartPregnancy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StartPregnancyRequest) =>
      pregnancyService.start(payload).then((r) => unwrap(r.data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pregnancy.all() });
      // Cycle predictions are suspended while pregnant — bust the caches
      // that show them so Home/Cycle stop showing a stale prediction.
      queryClient.invalidateQueries({ queryKey: queryKeys.periods.all() });
    },
  });
}

export function useEndPregnancy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => pregnancyService.end().then((r) => unwrap(r.data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pregnancy.all() });
      // Cycle prediction resumes immediately after ending.
      queryClient.invalidateQueries({ queryKey: queryKeys.periods.all() });
    },
  });
}
