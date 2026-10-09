/**
 * What a SUCCESSFUL Partner Today response means for the screen.
 *
 * Distinct from partnerHomeState.ts, which answers "did the request work /
 * is anyone linked" (loading, error, no_partner, connected). This answers the
 * question after that: the request worked and the pair is linked - is there
 * anything worth showing, and how current is it?
 *
 *   first_use  nothing has been recorded yet (a newly connected pair). Not an
 *              error and not "disconnected": the connection is working.
 *   low_data   the owner has recorded something but nothing usable is shared
 *              or derivable yet. Calm explanation, no invented insight.
 *   stale      real context exists, but the wellbeing information behind it
 *              has not been updated recently. Content stays, with a caveat.
 *   usable     real, current context.
 *
 * The decision is the SERVER's (`data_state`, `freshness`): this module only
 * maps it. A payload without those fields (a server older than P1) is plain
 * usable content - never guessed to be empty or stale.
 */
import type { PartnerTodayPayload } from '@types/intelligence.types';

export type PartnerTodayContentState = 'usable' | 'stale' | 'low_data' | 'first_use';

type FreshnessInput = Pick<PartnerTodayPayload, 'data_state' | 'freshness' | 'sharing'>;

export function resolvePartnerTodayContent(payload: FreshnessInput): PartnerTodayContentState {
  switch (payload.data_state) {
    case 'no_data':
      return 'first_use';
    case 'low_data':
      return 'low_data';
    case 'ready':
      // Only wellbeing the owner shares can be called stale.
      return payload.sharing?.wellbeing && payload.freshness?.wellbeing === 'stale'
        ? 'stale'
        : 'usable';
    default:
      return 'usable';
  }
}

/** One calm line about how current the wellbeing context is. null = say nothing. */
export function wellbeingFreshnessLine(
  freshness: PartnerTodayPayload['freshness'] | undefined,
  wellbeingShared: boolean,
): string | null {
  if (!wellbeingShared || !freshness?.wellbeing) { return null; }
  switch (freshness.wellbeing) {
    case 'today':
      return 'بر اساس اطلاعات امروز';
    case 'recent':
      return 'آخرین اطلاعات ثبت‌شده مربوط به چند روز پیش است';
    case 'stale':
      return 'حال‌وهوایش مدتی است به‌روز نشده؛ این برداشت‌ها شاید دیگر دقیق نباشند';
    case 'none':
      return 'هنوز چیزی از حال‌وهوایش ثبت نشده';
    default:
      return null;
  }
}

/** What the owner has chosen to share, in the words her own toggles use. */
export function sharedCategoryLabels(sharing: PartnerTodayPayload['sharing'] | undefined): string[] {
  if (!sharing) { return []; }
  const labels: string[] = [];
  if (sharing.period_status) { labels.push('مرحله‌ی چرخه'); }
  if (sharing.upcoming_period) { labels.push('دوره‌ی پیش‌رو'); }
  if (sharing.wellbeing) { labels.push('حال‌وهوای کلی'); }
  if (sharing.wellbeing && sharing.mood) { labels.push('خلق‌وخو'); }
  return labels;
}

/** Support themes beyond the primary one, worth a compact secondary row. */
export function secondaryThemes(themes: string[]): string[] {
  return themes.slice(1).filter((t) => t !== 'unknown' && t !== 'steady');
}

export const FIRST_USE_COPY = {
  title: 'ارتباطتان برقرار است',
  body: 'هنوز چیزی ثبت نشده. هر وقت او چیزی ثبت کند، اینجا هم می‌بینی — چیزی خراب نیست.',
};

export const LOW_DATA_COPY = {
  title: 'برای امروز اطلاعات کافی نیست',
  body: 'هر چه بیشتر ثبت کند، تصویر بهتری اینجا می‌بینی. فعلاً همین توجه‌ات کافی است.',
};
