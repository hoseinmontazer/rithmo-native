/**
 * useTodayFeedback — «بازخورد امروز» (Today 2.0, Layer B).
 *
 * A single explicit-trigger -> response interaction, same shape as
 * useAskRithmo: a mutation, never an auto-fetched query, nothing cached
 * or persisted client-side between requests (the backend itself has no
 * caching either — see ai_gateway/services.py::get_today_feedback's own
 * docstring). Free for every authenticated user; the Free-tier quota is
 * enforced server-side and surfaced here via `quota`, on both a
 * successful response and a 429 (quota exhausted) — the caller never has
 * to special-case which one carried it.
 */
import { useMutation } from '@tanstack/react-query';
import { todayFeedbackService } from '@api/services/todayFeedbackService';
import { useAuth } from '@hooks/useAuth';
import type { TodayFeedbackQuota, TodayFeedbackResponse } from '@types/todayFeedback.types';

export function useTodayFeedback() {
  const { isAuthenticated } = useAuth();

  const mutation = useMutation<TodayFeedbackResponse, unknown, void>({
    mutationFn: () => {
      if (!isAuthenticated) {
        return Promise.reject(new Error('not_authenticated'));
      }
      return todayFeedbackService.requestFeedback();
    },
  });

  const quotaFromError = (mutation.error as any)?.response?.data?.quota as
    | TodayFeedbackQuota
    | undefined;
  const isQuotaExhausted = (mutation.error as any)?.response?.status === 429;

  return {
    requestFeedback: mutation.mutate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isQuotaExhausted,
    error: mutation.error,
    // Only meaningful once a real response has actually arrived — before
    // that (idle) this must stay `undefined`, never `false`, or "never
    // asked yet" and "asked and got no feedback" render identically.
    available: mutation.isSuccess ? mutation.data?.available : undefined,
    feedback: mutation.data?.available ? mutation.data.feedback : undefined,
    quota: mutation.data?.quota ?? quotaFromError,
    reset: mutation.reset,
  };
}
