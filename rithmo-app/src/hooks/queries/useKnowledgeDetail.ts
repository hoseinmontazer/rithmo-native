import { useQuery } from '@tanstack/react-query';
import { knowledgeService } from '@api/services/knowledgeService';
import { queryKeys } from '@api/queryKeys';
import { useAuth } from '@hooks/useAuth';

export function useKnowledgeDetail(itemId: number) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.knowledge.detail(itemId),
    queryFn: () => knowledgeService.getDetail(itemId).then((r) => r.data),
    enabled: isAuthenticated && Number.isFinite(itemId),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
