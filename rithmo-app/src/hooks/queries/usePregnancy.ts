/**
 * usePregnancyStatus / useStartPregnancy / useEndPregnancy
 *
 * Free for every authenticated user (docs/DECISIONS.md DEC-005 —
 * Progressive Premium Value: pregnancy status/tracking and the Pregnancy
 * Timeline have no deeper "premium" layer to withhold, so the backend
 * gate was removed rather than split; these queries used to also disable
 * themselves for a non-premium user, which would have silently kept a
 * free user's screen empty even after the screen-level paywall was
 * removed). Enabled for any authenticated user now.
 *
 * All gestational-week/day/trimester/due-date values come straight from
 * the API response — nothing here recomputes them. The backend remains
 * the single source of truth (cycle_tracker.services.pregnancy_service).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pregnancyService } from '@api/services/pregnancyService';
import { queryKeys } from '@api/queryKeys';
import { useAuth } from '@hooks/useAuth';
import type { PregnancyStatus, StartPregnancyRequest } from '@types/pregnancy.types';
import type { PregnancyTimelinePayload } from '@types/pregnancyTimeline.types';

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

  return useQuery({
    queryKey: queryKeys.pregnancy.status(),
    queryFn: () => pregnancyService.getStatus().then((r) => unwrap(r.data)),
    enabled: isAuthenticated,
  });
}

/**
 * Pregnancy Intelligence Mode + Timeline (P1.3) — free (see module
 * docstring above). `active: false` (no active pregnancy) is a normal
 * successful response, not an error — the screen branches on it, it
 * never triggers a retry/error state.
 */
export function usePregnancyTimeline(enabled = true) {
  const { isAuthenticated } = useAuth();

  return useQuery<PregnancyTimelinePayload>({
    queryKey: queryKeys.pregnancy.timeline(),
    queryFn: () => pregnancyService.getTimeline().then((r) => r.data.data),
    enabled: enabled && isAuthenticated,
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
