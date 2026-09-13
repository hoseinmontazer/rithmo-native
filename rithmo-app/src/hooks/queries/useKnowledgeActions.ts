import { useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeService } from '@api/services/knowledgeService';
import { queryKeys } from '@api/queryKeys';

function useInvalidateKnowledge() {
  const queryClient = useQueryClient();
  // itemId is required, not optional: a save/dismiss always targets one
  // specific item, and KnowledgeDetailScreen reads its saved/dismissed
  // state from queryKeys.knowledge.detail(itemId) — omitting it here
  // left that screen's own query stale after a successful save, so the
  // button's saved-state text never visibly changed even though the
  // request succeeded.
  return (itemId: number) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.today() });
    queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.history() });
    queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.detail(itemId) });
  };
}

export function useSaveKnowledgeItem() {
  const invalidate = useInvalidateKnowledge();
  return useMutation({
    mutationFn: (itemId: number) => knowledgeService.save(itemId),
    onSuccess: (_data, itemId) => invalidate(itemId),
  });
}

export function useDismissKnowledgeItem() {
  const invalidate = useInvalidateKnowledge();
  return useMutation({
    mutationFn: (itemId: number) => knowledgeService.dismiss(itemId),
    onSuccess: (_data, itemId) => invalidate(itemId),
  });
}

export function useSendKnowledgeFeedback() {
  return useMutation({
    mutationFn: ({ itemId, value }: { itemId: number; value: 'helpful' | 'not_relevant' }) =>
      knowledgeService.sendFeedback(itemId, value),
  });
}
