/**
 * The one short, deterministic sentence shown when a check-in completes.
 * Built only from which KINDS of answers were recorded (server `summary`),
 * never from values, and it makes no medical claim and no promise about what
 * Rithmo will do with them.
 */
import type { CheckInCompletionSummary, CheckInRecordedKind } from '../../types/checkinSession.types';

const KIND_FA: Record<CheckInRecordedKind, string> = {
  mood: 'حال‌وهوا',
  energy: 'انرژی',
  pain: 'درد',
  sleep: 'خواب',
  stress: 'استرس',
  symptoms: 'علائم',
  context: 'شرایط امروز',
  note: 'یادداشتت',
};

const ORDER: CheckInRecordedKind[] = ['mood', 'energy', 'pain', 'sleep', 'stress', 'symptoms', 'context', 'note'];

export function checkInAcknowledgement(summary?: CheckInCompletionSummary | null): string {
  const kinds = ORDER.filter((k) => summary?.recorded?.includes(k));
  if (kinds.length === 0) {
    return 'این بار چیزی برای ثبت نبود، و اشکالی ندارد.';
  }
  const names = kinds.map((k) => KIND_FA[k]);
  const list = names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join('، ')} و ${names[names.length - 1]}`;
  return `${list} ثبت شد.`;
}

/** Today Feedback needs today's wellness log; offer it only when one exists. */
export function canOfferTodayFeedback(summary?: CheckInCompletionSummary | null): boolean {
  return summary?.has_log_today === true;
}

/** One short pointer to where the answers now live, only when something was
 * really recorded (the Home «امروز ثبت کردی» row shows exactly those). */
export function checkInHomeHint(summary?: CheckInCompletionSummary | null): string | null {
  return (summary?.recorded?.length ?? 0) > 0 ? 'توی صفحهٔ خانه می‌بینیش.' : null;
}
