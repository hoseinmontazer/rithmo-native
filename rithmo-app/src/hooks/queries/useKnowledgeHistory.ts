import { useQuery } from '@tanstack/react-query';
import { knowledgeService } from '@api/services/knowledgeService';
import { queryKeys } from '@api/queryKeys';
import { useAuth } from '@hooks/useAuth';

export function useKnowledgeHistory() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.knowledge.history(),
    queryFn: () => knowledgeService.getHistory().then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    retry: false,
  });
}
