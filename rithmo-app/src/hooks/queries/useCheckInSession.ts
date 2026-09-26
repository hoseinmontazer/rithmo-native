import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkinSessionService } from '@api/services/checkinSessionService';
import { queryKeys } from '@api/queryKeys';
import type { CheckInSessionState, SubmitCheckInAnswerParams } from '@types/checkinSession.types';
import type { TypedAxiosError } from '@types/api.types';

/**
 * Today's adaptive check-in session — server-authoritative. `staleTime: 0`
 * (unlike `useToday()`'s 5-minute staleness): the whole point of this
 * query is "what does the server say the current question is right now",
 * which must never be served from a cache the answer mutation didn't just
 * write — see useSubmitCheckInAnswer's onSuccess, which always seeds this
 * exact cache entry with the fresh server response instead of relying on
 * a background refetch.
 */
export function useCheckInSessionToday(enabled = true) {
  return useQuery<CheckInSessionState>({
    queryKey: queryKeys.checkinSession.today(),
    queryFn: () => checkinSessionService.getToday(),
    enabled,
    staleTime: 0,
  });
}

/** True for the one error shape the caller must react to specially — the
 * submitted answer was for a question that is no longer current (design
 * §17's `question_mismatch`, always HTTP 409). Every other 4xx is a
 * plain validation failure, shown via the existing ErrorState/
 * extractErrorMessage convention like any other screen's mutation error. */
export function isStaleQuestionError(error: unknown): boolean {
  return (error as TypedAxiosError)?.response?.status === 409;
}

export function useSubmitCheckInAnswer() {
  const queryClient = useQueryClient();

  return useMutation<CheckInSessionState, TypedAxiosError, SubmitCheckInAnswerParams>({
    mutationFn: (params) => checkinSessionService.submitAnswer(params),
    onSuccess: (data) => {
      // Seed the session cache directly from the response — the server
      // just told us the new current state, a refetch would only ask it
      // to repeat itself.
      queryClient.setQueryData(queryKeys.checkinSession.today(), data);

      if (data.completed) {
        // The session just finished — whatever it collected is now in
        // WellnessLog/SymptomEntry/ContextEntry. Narrow, targeted
        // invalidation only (§15) — never a broad "refetch everything".
        queryClient.invalidateQueries({ queryKey: queryKeys.wellness.today() });
        queryClient.invalidateQueries({ queryKey: queryKeys.wellness.all() });
        queryClient.invalidateQueries({ queryKey: queryKeys.contextEntries.all() });
        queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.today() });
      }
    },
  });
}

/**
 * The one reconciliation path the design's error contract requires
 * (§12/§17): a `question_mismatch` means this client's view of the
 * session is stale — refetch and adopt the server's real current state,
 * never retry the same (now-invalid) submission.
 */
export function useReconcileCheckInSession() {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    const fresh = await checkinSessionService.getToday();
    queryClient.setQueryData(queryKeys.checkinSession.today(), fresh);
    return fresh;
  }, [queryClient]);
}
