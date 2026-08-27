import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { intelligenceService } from '@api/services/intelligenceService';
import { queryKeys } from '@api/queryKeys';
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
