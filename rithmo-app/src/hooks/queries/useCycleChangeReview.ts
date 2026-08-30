/**
 * useCycleChangeReview — «این چرخه چه فرقی داشت؟»
 *
 * Same contract as useDailyReflection (see that file's own docstring):
 * premium-only, query disabled entirely for a non-premium/unauthenticated
 * user, and every failure mode (not premium, AI unavailable, invalid
 * output, still in Learning Mode with no baseline yet) collapses into the
 * same "nothing to show" state — the UI never distinguishes why.
 */
import { useQuery } from '@tanstack/react-query';
import { aiReflectionService } from '@api/services/aiReflectionService';
import { queryKeys } from '@api/queryKeys';
import { useAuth } from '@hooks/useAuth';
import { usePremiumStatus } from '@hooks/queries/useSubscription';

export function useCycleChangeReview() {
  const { isAuthenticated } = useAuth();
  const { isPremium, isLoading: isPremiumLoading } = usePremiumStatus();

  const query = useQuery({
    queryKey: queryKeys.aiReflection.cycleChange(),
    queryFn: () => aiReflectionService.getCycleChangeReview().then((r) => r.data),
    enabled: isAuthenticated && !isPremiumLoading && isPremium,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    isLoading: query.isLoading,
    review: query.data?.available ? query.data.reflection : undefined,
  };
}
