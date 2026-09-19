import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { intelligenceService } from '@api/services/intelligenceService';
import { queryKeys } from '@api/queryKeys';
import { useAuth } from '@hooks/useAuth';
import { usePremiumStatus } from '@hooks/queries/useSubscription';
import type {
  ActionStatus,
  CheckIn,
  GuidedAction,
  Helpfulness,
  Insight,
  PartnerTodayResponse,
  ProgressPayload,
  TodayPayload,
} from '@types/intelligence.types';
import type { ForecastPayload } from '@types/forecast.types';
import type { MonthlyReviewPayload } from '@types/monthlyReview.types';
import type { DoctorReportPayload } from '@types/doctorReport.types';
import type { FertileWindowPayload } from '@types/fertileWindow.types';
import type { HealthChangePayload } from '@types/healthChange.types';

/**
 * Today's personal state, leading insight and guided actions.
 *
 * The server holds this stable for the whole day on purpose, so a refetch
 * returns the same recommendation the user already read. Refetching on
 * focus is therefore safe and cheap, and it picks up feedback submitted
 * elsewhere in the app.
 */
export function useToday(enabled = true) {
  return useQuery<TodayPayload>({
    queryKey: queryKeys.intelligence.today(),
    queryFn: () => intelligenceService.getToday(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInsights(includeInsufficient = false, enabled = true) {
  return useQuery<{ learning_mode: boolean; insights: Insight[] }>({
    queryKey: queryKeys.intelligence.insights(includeInsufficient),
    queryFn: () => intelligenceService.getInsights(includeInsufficient),
    enabled,
  });
}

export function useProgress(enabled = true) {
  return useQuery<ProgressPayload>({
    queryKey: queryKeys.intelligence.progress(),
    queryFn: () => intelligenceService.getProgress(),
    enabled,
  });
}

/**
 * Personalized Symptom Forecast (P0.5) — free/Premium split
 * (docs/DECISIONS.md DEC-005): every user gets the honest status
 * (learning mode / no pattern yet / a real pattern found, plus
 * `forecast_count` once free); only the projected date windows
 * (`forecasts`) require Premium, gated internally by the payload itself
 * (`premium_required`/`premium_teaser_fa`). Used to also disable the
 * query entirely for a non-premium user, which would have kept a free
 * user's screen empty even after the screen-level paywall is removed.
 */
export function useForecast(enabled = true) {
  const { isAuthenticated } = useAuth();

  return useQuery<ForecastPayload>({
    queryKey: queryKeys.intelligence.forecast(),
    queryFn: () => intelligenceService.getForecast(),
    enabled: enabled && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Monthly Review's deterministic sections (P0.6) — free/Premium split
 * (DEC-005): cycle stats, most-common symptoms, and biggest changes are
 * free; cross-cycle `patterns` and `next_cycle_expectations` require
 * Premium, gated internally by the payload. Distinct from
 * useMonthlyReviewNarrative (the AI synthesis built on top of this same
 * data, which stays fully Premium-gated — not part of this pass).
 */
export function useMonthlyReview(enabled = true) {
  const { isAuthenticated } = useAuth();

  return useQuery<MonthlyReviewPayload>({
    queryKey: queryKeys.intelligence.monthlyReview(),
    queryFn: () => intelligenceService.getMonthlyReview(),
    enabled: enabled && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Doctor Health Report's deterministic sections (P0.8) — free/Premium
 * split (DEC-005): report_period/tracking_coverage/data_sufficiency and
 * observation.cycle_summary are free; the clinical-conversation content
 * (symptom_patterns, pain_summary, recent_changes, medical_information,
 * follow_up) requires Premium, gated internally by the payload. Distinct
 * from useDoctorReportNarrative (the optional AI summary, which stays
 * fully Premium-gated — not part of this pass).
 */
export function useDoctorReport(enabled = true) {
  const { isAuthenticated } = useAuth();

  return useQuery<DoctorReportPayload>({
    queryKey: queryKeys.intelligence.doctorReport(),
    queryFn: () => intelligenceService.getDoctorReport(),
    enabled: enabled && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fertile Window Intelligence (P1.1) — Premium. Same gating contract as
 * useForecast/useMonthlyReview/useDoctorReport: disabled entirely for a
 * non-premium/unauthenticated user, so a free user's client never
 * receives Premium data at all.
 */
export function useFertileWindow(enabled = true) {
  const { isAuthenticated } = useAuth();
  const { isPremium, isLoading: isPremiumLoading } = usePremiumStatus();

  return useQuery<FertileWindowPayload>({
    queryKey: queryKeys.intelligence.fertileWindow(),
    queryFn: () => intelligenceService.getFertileWindow(),
    enabled: enabled && isAuthenticated && !isPremiumLoading && isPremium,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Health Change Detection + Pain/PMS Intelligence (P1.2) — Premium. Same
 * gating contract as useForecast/useFertileWindow: disabled entirely for
 * a non-premium/unauthenticated user, so a free user's client never
 * receives the curated digest — the underlying insights themselves stay
 * on the free useInsights() feed, unchanged.
 */
export function useHealthChanges(enabled = true) {
  const { isAuthenticated } = useAuth();
  const { isPremium, isLoading: isPremiumLoading } = usePremiumStatus();

  return useQuery<HealthChangePayload>({
    queryKey: queryKeys.intelligence.healthChanges(),
    queryFn: () => intelligenceService.getHealthChanges(),
    enabled: enabled && isAuthenticated && !isPremiumLoading && isPremium,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePartnerToday(enabled = true) {
  return useQuery<PartnerTodayResponse>({
    queryKey: queryKeys.intelligence.partnerToday(),
    queryFn: () => intelligenceService.getPartnerToday(),
    enabled,
  });
}

export interface FeedbackInput {
  actionId: number;
  status: ActionStatus;
  helpfulness?: Helpfulness;
  note?: string;
}

/**
 * The closing edge of the learning loop.
 *
 * Optimistically writes the feedback into the cached day so the card
 * responds immediately, then reconciles with the server. The optimistic
 * value is rolled back on failure rather than left in place — a user who
 * believes she told us something we never recorded is worse off than one
 * who sees the tap fail.
 */
export function useSubmitActionFeedback() {
  const queryClient = useQueryClient();

  return useMutation<GuidedAction, Error, FeedbackInput, { previous?: TodayPayload }>({
    mutationFn: ({ actionId, status, helpfulness, note }) =>
      intelligenceService.submitFeedback(actionId, status, helpfulness, note),

    onMutate: async ({ actionId, status, helpfulness, note }) => {
      const key = queryKeys.intelligence.today();
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TodayPayload>(key);

      if (previous) {
        queryClient.setQueryData<TodayPayload>(key, {
          ...previous,
          actions: previous.actions.map((action) =>
            action.id === actionId
              ? {
                  ...action,
                  feedback: {
                    status,
                    helpfulness: helpfulness ?? null,
                    note: note ?? '',
                  },
                }
              : action,
          ),
        });
      }
      return { previous };
    },

    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.intelligence.today(), context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.today() });
      // Feedback changes what "has helped you" can say.
      queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.progress() });
    },
  });
}

export function useDismissInsight() {
  const queryClient = useQueryClient();

  return useMutation<{ key: string; dismissed: boolean }, Error, string>({
    mutationFn: (key) => intelligenceService.dismissInsight(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.all() });
    },
  });
}

export function useSetInsightAccuracy() {
  const queryClient = useQueryClient();

  return useMutation<
    { key: string; accurate: boolean },
    Error,
    { key: string; accurate: boolean }
  >({
    mutationFn: ({ key, accurate }) => intelligenceService.setInsightAccuracy(key, accurate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.all() });
    },
  });
}

export function useRespondToCheckIn() {
  const queryClient = useQueryClient();

  return useMutation<CheckIn, Error, { checkinId: number; value: string }>({
    mutationFn: ({ checkinId, value }) => intelligenceService.respondToCheckIn(checkinId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.all() });
    },
  });
}

export function useDismissCheckIn() {
  const queryClient = useQueryClient();

  return useMutation<CheckIn, Error, number>({
    mutationFn: (checkinId) => intelligenceService.dismissCheckIn(checkinId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.all() });
    },
  });
}

/** Partner Mode's own data — nothing here is ever read back by the owner. */
export function useLogPartnerAction() {
  return useMutation<{ action: string }, Error, string>({
    mutationFn: (action) => intelligenceService.logPartnerAction(action),
  });
}
