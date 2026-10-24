/**
 * useReproductiveGoal / useSetReproductiveGoal / useRemoveReproductiveGoal
 *
 * The goal is a sensitive, optional, owner-only choice. It lives under its OWN
 * query key (never `profile`) and its own endpoint, so it is not part of any
 * generic profile cache, and `queryClient.clear()` on logout drops it.
 *
 * The cache only ever holds what the SERVER returned: mutations write the
 * server's response into the cache in `onSuccess`, never an optimistic guess,
 * so the screen cannot show a saved state that the backend did not confirm.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reproductiveGoalService } from '@api/services/reproductiveGoalService';
import { queryKeys } from '@api/queryKeys';
import { useAuth } from '@hooks/useAuth';
import { useRole } from '@hooks/useRole';
import type { ReproductiveGoal, ReproductiveGoalPayload } from '@types/reproductiveGoal.types';

export function useReproductiveGoal() {
  const { isAuthenticated } = useAuth();
  const { isPartner, isResolved } = useRole();

  return useQuery<ReproductiveGoalPayload>({
    queryKey: queryKeys.reproductiveGoal.all(),
    queryFn: () => reproductiveGoalService.get().then((r) => r.data),
    enabled: isAuthenticated && isResolved && !isPartner,
    // A 403 means "this account type has no goal" - retrying cannot change it.
    retry: (count, error) =>
      (error as { response?: { status?: number } })?.response?.status !== 403 && count < 1,
  });
}

function useGoalCacheWriter() {
  const queryClient = useQueryClient();
  return (payload: ReproductiveGoalPayload) =>
    queryClient.setQueryData(queryKeys.reproductiveGoal.all(), payload);
}

export function useSetReproductiveGoal() {
  const write = useGoalCacheWriter();
  return useMutation({
    mutationFn: (goal: ReproductiveGoal) => reproductiveGoalService.set(goal).then((r) => r.data),
    onSuccess: write,
  });
}

export function useRemoveReproductiveGoal() {
  const write = useGoalCacheWriter();
  return useMutation({
    mutationFn: () => reproductiveGoalService.remove().then((r) => r.data),
    onSuccess: write,
  });
}
