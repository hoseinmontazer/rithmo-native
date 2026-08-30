/**
 * useWeeklyReview — «مرور این هفته»
 *
 * Same contract as useDailyReflection/useCycleChangeReview: premium-only,
 * disabled entirely for a non-premium/unauthenticated user, every failure
 * mode (not premium, AI unavailable, invalid output, still in Learning
 * Mode) collapses into the same "nothing to show" state.
 */
import { useQuery } from '@tanstack/react-query';
import { aiReflectionService } from '@api/services/aiReflectionService';
import { queryKeys } from '@api/queryKeys';
import { useAuth } from '@hooks/useAuth';
import { usePremiumStatus } from '@hooks/queries/useSubscription';

export function useWeeklyReview() {
  const { isAuthenticated } = useAuth();
  const { isPremium, isLoading: isPremiumLoading } = usePremiumStatus();

  const query = useQuery({
    queryKey: queryKeys.aiReflection.weeklyReview(),
    queryFn: () => aiReflectionService.getWeeklyReview().then((r) => r.data),
    enabled: isAuthenticated && !isPremiumLoading && isPremium,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    isLoading: query.isLoading,
    review: query.data?.available ? query.data.reflection : undefined,
  };
}
