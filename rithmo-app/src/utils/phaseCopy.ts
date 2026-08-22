/**
 * phaseCopy.ts — localized Persian copy for cycle phases.
 *
 * The backend remains the source of truth for the FACTS (which phase,
 * cycle day, predicted dates, confidence). Its description strings are
 * English, so all user-facing phase text lives here.
 */
import type { CyclePhase } from '@types/period.types';

export interface PhaseCopy {
  name: string;
  emoji: string;
  description: string;
}

export const PHASE_COPY: Record<CyclePhase, PhaseCopy> = {
  menstrual: {
    name: 'روزهای دوره',
    emoji: '🌸',
    description: 'روزهای دوره‌ای — استراحت، مایعات گرم و مراقبت از خودت.',
  },
  follicular: {
    name: 'فولیکولار',
    emoji: '🌱',
    description: 'بدنت در حال آماده‌سازی برای تخمک‌گذاری است و انرژی‌ات به‌تدریج بالا می‌رود.',
  },
  ovulation: {
    name: 'تخمک‌گذاری',
    emoji: '✨',
    description: 'روز تخمک‌گذاری — اوج باروری در این روزها.',
  },
  luteal: {
    name: 'لوتئال',
    emoji: '🌙',
    description: 'بعد از تخمک‌گذاری — چند روز دیگر تا دوره‌ی بعدی.',
  },
  expected: {
    name: 'امروز پیش‌بینی دوره',
    emoji: '🔮',
    description: 'دوره‌ی بعدی برای امروز پیش‌بینی شده.',
  },
  late: {
    name: 'شروع با تأخیر',
    emoji: '⏳',
    description: 'دوره با کمی تأخیر شروع شده.',
  },
  overdue: {
    name: 'دیرتر از پیش‌بینی',
    emoji: '⏳',
    description: 'دوره‌ی بعدی هنوز شروع نشده.',
  },
  unknown: {
    name: '—',
    emoji: '🌱',
    description: 'با ثبت اولین دوره، چرخه‌ات را شروع می‌کنیم.',
  },
};

/**
 * Persian word for the prediction confidence label.
 *
 * Re-exported from the canonical i18n map rather than redefined here — this
 * file used to carry its own copy, so `medium` had two independent Persian
 * translations in the codebase and could drift.
 */
export { confidenceLabels as CONFIDENCE_PERSIAN } from '@i18n/strings.fa';
