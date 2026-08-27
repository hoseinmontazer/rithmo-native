/**
 * useDailyReflection
 *
 * Premium-only, like usePregnancyStatus — the query is disabled entirely
 * for a non-premium or unauthenticated user, since the backend would
 * reject it anyway (IsPremiumUser). Query failures (network error, 5xx)
 * are treated the same as {available: false} by the caller — this hook
 * intentionally does not distinguish "AI said no" from "request failed";
 * either way there is simply no reflection to show today, and the UI must
 * never surface an AI-specific error banner (see DailyReflectionCard).
 */
import { useQuery } from '@tanstack/react-query';
import { aiReflectionService } from '@api/services/aiReflectionService';
import { queryKeys } from '@api/queryKeys';
import { useAuth } from '@hooks/useAuth';
import { usePremiumStatus } from '@hooks/queries/useSubscription';

export function useDailyReflection() {
  const { isAuthenticated } = useAuth();
  const { isPremium, isLoading: isPremiumLoading } = usePremiumStatus();

  const query = useQuery({
    queryKey: queryKeys.aiReflection.daily(),
    queryFn: () => aiReflectionService.getDailyReflection().then((r) => r.data),
    enabled: isAuthenticated && !isPremiumLoading && isPremium,
    retry: false, // no synchronous retry — a slow/unavailable AI provider must not block the UI
    staleTime: 5 * 60 * 1000,
  });

  return {
    isLoading: query.isLoading,
    reflection: query.data?.available ? query.data.reflection : undefined,
  };
}
