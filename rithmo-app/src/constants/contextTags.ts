/**
 * Today 2.0 context tags — mirrors cycle_tracker.models.ContextEntry
 * .TAG_CHOICES exactly (see that model's own docstring for why this is a
 * small, closed set rather than an open vocabulary like symptoms).
 */
import type { ContextTag } from '@types/contextEntry.types';

export interface ContextTagOption {
  code: ContextTag;
  label: string;
}

export const CONTEXT_TAGS: readonly ContextTagOption[] = [
  { code: 'illness', label: 'بیمار بودم' },
  { code: 'medication', label: 'دارو مصرف کردم' },
  { code: 'unusual_stress', label: 'استرس غیرعادی داشتم' },
  { code: 'unusual_positive', label: 'حالم غیرعادی خوب بود' },
  { code: 'sleep_disruption', label: 'خوابم متفاوت بود' },
  { code: 'travel', label: 'سفر بودم' },
  { code: 'lifestyle_change', label: 'تغییر مهمی در سبک زندگی داشتم' },
  { code: 'other', label: 'مورد دیگری' },
] as const;
