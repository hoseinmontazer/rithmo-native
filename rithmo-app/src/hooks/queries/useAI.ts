import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiService } from '@api/services/aiService';
import { queryKeys } from '@api/queryKeys';
import type { AISuggestionFeedbackRequest } from '@types/ai.types';

export function useAISuggestion() {
  return useQuery({
    queryKey: queryKeys.ai.suggestion(),
    queryFn: async () => {
      try {
        const response = await aiService.getSuggestion();
        return response.data;
      } catch (error: any) {
        // 404 means no suggestion available yet
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    },
    staleTime: 30 * 60 * 1000, // suggestions are fresh for 30 min
  });
}

export function useAISuggestionHistory() {
  return useQuery({
    queryKey: queryKeys.ai.history(),
    queryFn: () => aiService.getSuggestionHistory().then((r) => r.data),
  });
}

export function useAIModelStatus() {
  return useQuery({
    queryKey: queryKeys.ai.modelStatus(),
    queryFn: () => aiService.getModelStatus().then((r) => r.data),
  });
}

export function useAIDebugSuggestions() {
  return useQuery({
    queryKey: queryKeys.ai.debugSuggestions(),
    queryFn: () => aiService.getDebugSuggestions().then((r) => r.data),
  });
}

export function useSubmitAIFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AISuggestionFeedbackRequest }) =>
      aiService.submitFeedback(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.history() });
    },
  });
}
