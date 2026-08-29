/**
 * usePartnerReflection
 *
 * Same shape and contract as useDailyReflection() — premium-gated on the
 * REQUESTING (partner) user's own status, query failures collapse to
 * "nothing to show" rather than an error, no synchronous retry. See that
 * hook's own comment; this is the partner-side twin, not a variant of it.
 */
import { useQuery } from '@tanstack/react-query';
import { aiReflectionService } from '@api/services/aiReflectionService';
import { queryKeys } from '@api/queryKeys';
import { useAuth } from '@hooks/useAuth';
import { usePremiumStatus } from '@hooks/queries/useSubscription';

export function usePartnerReflection() {
  const { isAuthenticated } = useAuth();
  const { isPremium, isLoading: isPremiumLoading } = usePremiumStatus();

  const query = useQuery({
    queryKey: queryKeys.aiReflection.partner(),
    queryFn: () => aiReflectionService.getPartnerReflection().then((r) => r.data),
    enabled: isAuthenticated && !isPremiumLoading && isPremium,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    isLoading: query.isLoading,
    reflection: query.data?.available ? query.data.reflection : undefined,
  };
}
