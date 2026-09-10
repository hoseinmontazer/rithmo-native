import { useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeService } from '@api/services/knowledgeService';
import { queryKeys } from '@api/queryKeys';

function useInvalidateKnowledge() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.today() });
    queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.history() });
  };
}

export function useSaveKnowledgeItem() {
  const invalidate = useInvalidateKnowledge();
  return useMutation({
    mutationFn: (itemId: number) => knowledgeService.save(itemId),
    onSuccess: invalidate,
  });
}

export function useDismissKnowledgeItem() {
  const invalidate = useInvalidateKnowledge();
  return useMutation({
    mutationFn: (itemId: number) => knowledgeService.dismiss(itemId),
    onSuccess: invalidate,
  });
}

export function useSendKnowledgeFeedback() {
  return useMutation({
    mutationFn: ({ itemId, value }: { itemId: number; value: 'helpful' | 'not_relevant' }) =>
      knowledgeService.sendFeedback(itemId, value),
  });
}
