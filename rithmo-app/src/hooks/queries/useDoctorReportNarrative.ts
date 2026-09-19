/**
 * useDoctorReportNarrative — optional AI summary on top of the
 * deterministic Doctor Health Report.
 *
 * Same contract as useMonthlyReviewNarrative/useWeeklyReview: premium-
 * only, disabled entirely for a non-premium/unauthenticated user, every
 * failure mode (not premium, AI unavailable, invalid/ungrounded output,
 * still in Learning Mode) collapses into the same "nothing to show"
 * state. Distinct from useDoctorReport (the facts this narrative is
 * built on top of, which remain available on their own regardless).
 */
import { useQuery } from '@tanstack/react-query';
import { aiReflectionService } from '@api/services/aiReflectionService';
import { queryKeys } from '@api/queryKeys';
import { useAuth } from '@hooks/useAuth';
import { usePremiumStatus } from '@hooks/queries/useSubscription';

export function useDoctorReportNarrative() {
  const { isAuthenticated } = useAuth();
  const { isPremium, isLoading: isPremiumLoading } = usePremiumStatus();

  const query = useQuery({
    queryKey: queryKeys.aiReflection.doctorReport(),
    queryFn: () => aiReflectionService.getDoctorReport().then((r) => r.data),
    enabled: isAuthenticated && !isPremiumLoading && isPremium,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    isLoading: query.isLoading,
    review: query.data?.available ? query.data.reflection : undefined,
  };
}
