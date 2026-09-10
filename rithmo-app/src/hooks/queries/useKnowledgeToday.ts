/**
 * useKnowledgeToday
 *
 * Unlike useDailyReflection (Premium-only, query disabled entirely for a
 * free user), this query is enabled for ANY authenticated user — the
 * Living Health Knowledge Layer must show free users a real, if smaller,
 * slice of content, never nothing. Free vs. premium quantity/
 * personalization/detail depth is decided entirely server-side (see
 * knowledge/views.py's KnowledgeTodayView); this hook has no premium
 * check of its own on purpose. (Explicit regression guard: see
 * useKnowledgeToday.test.ts.)
 */
import { useQuery } from '@tanstack/react-query';
import { knowledgeService } from '@api/services/knowledgeService';
import { queryKeys } from '@api/queryKeys';
import { useAuth } from '@hooks/useAuth';

export function useKnowledgeToday() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.knowledge.today(),
    queryFn: () => knowledgeService.getToday().then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
