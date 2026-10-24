/**
 * Reviewed education content. Public on the server, so these queries do not
 * wait for a profile or a role: the guide must always be reachable. Content
 * changes rarely, so it is cached for a long time and re-fetched cheaply (the
 * server answers an unchanged article with a 304).
 */
import { useQuery } from '@tanstack/react-query';
import { healthGuideService } from '@api/services/healthGuideService';
import { queryKeys } from '@api/queryKeys';
import type { GuideArticle, GuideIndexPayload } from '@types/healthGuide.types';

const TEN_MINUTES = 10 * 60 * 1000;

export function useGuideIndex() {
  return useQuery<GuideIndexPayload>({
    queryKey: queryKeys.healthGuide.index(),
    queryFn: () => healthGuideService.getIndex().then((r) => r.data.data),
    staleTime: TEN_MINUTES,
  });
}

export function useGuideArticle(slug: string) {
  return useQuery<GuideArticle>({
    queryKey: queryKeys.healthGuide.article(slug),
    queryFn: () => healthGuideService.getArticle(slug).then((r) => r.data.data),
    staleTime: TEN_MINUTES,
    // an unknown or not-yet-approved article is a 404: retrying cannot change it
    retry: (count, error) =>
      (error as { response?: { status?: number } })?.response?.status !== 404 && count < 1,
  });
}

export function useMethodComparison() {
  return useQuery<GuideArticle>({
    queryKey: queryKeys.healthGuide.methods(),
    queryFn: () => healthGuideService.getMethods().then((r) => r.data.data),
    staleTime: TEN_MINUTES,
    retry: (count, error) =>
      (error as { response?: { status?: number } })?.response?.status !== 404 && count < 1,
  });
}
