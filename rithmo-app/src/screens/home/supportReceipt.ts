/**
 * Partner 2.0 P3 - copy and pure logic for the owner's small receipt and the
 * partner's tiny view of the response.
 *
 * Principles encoded here:
 *   - small, warm, optional, no pressure: nothing on the card requires an
 *     answer, nothing says "waiting", there are no counters or reminders;
 *   - honest: `time_together` is an INTENTION ("would like to be near you"),
 *     never "spent time with you"; nothing claims the app knows what happened;
 *   - no health or context: the text depends on the gesture kind ONLY;
 *   - no emoji anywhere (project rule): reactions are icons plus a word.
 */
import type { SupportReaction, SupportReceiptKind } from '@types/intelligence.types';

export const RECEIPT_COPY: Record<SupportReceiptKind, { title: string; body: string }> = {
  checked_in: {
    title: 'شریکت می‌خواد بدونی کنارته',
    body: 'یه نشونه‌ی کوچیک از طرف او. لازم نیست جوابی بدی.',
  },
  time_together: {
    title: 'شریکت امروز دلش می‌خواد کنارت باشه',
    body: 'فقط یه خبر کوچیکه؛ هر طور خودت راحتی.',
  },
};

export interface ReactionOption {
  value: SupportReaction;
  label: string;
  /** MaterialCommunityIcons name - icons, never emoji. */
  icon: string;
}

export const REACTION_OPTIONS: ReactionOption[] = [
  { value: 'heart', label: 'قلب', icon: 'heart-outline' },
  { value: 'thanks', label: 'مرسی', icon: 'hand-heart-outline' },
  { value: 'hug', label: 'بغل', icon: 'human-greeting-variant' },
];

export const REACTION_SENT_FA = 'فرستاده شد';
export const RECEIPT_LATER_FA = 'بعداً';

/** What the partner sees after the owner reacted: tiny, past tense, no names. */
export function partnerResponseLine(
  response: { reaction: string; action: string } | null | undefined,
): { icon: string; text: string } | null {
  if (!response) { return null; }
  const option = REACTION_OPTIONS.find((o) => o.value === response.reaction);
  if (!option) { return null; }
  return { icon: option.icon, text: `او برات «${option.label}» فرستاد` };
}

/**
 * What the partner is told, honestly, about who may see an action - shown with
 * the recorded confirmation. `gave_space` is explicitly private; `message`
 * explains that nothing leaves until they send it.
 */
export const ACTION_VISIBILITY_NOTE_FA: Record<string, string> = {
  message: 'تا خودت نفرستی، چیزی برای او نمی‌رود.',
  checked_in: 'ممکن است او یک نشونه‌ی کوچیک از این ببیند.',
  time_together: 'ممکن است او یک خبر کوچیک از این ببیند.',
  gave_space: 'این فقط برای خودت است؛ او چیزی نمی‌بیند.',
};

/** Only these ever reach the owner (mirror of the server allowlist). */
export const OWNER_VISIBLE_KINDS: ReadonlyArray<string> = ['checked_in', 'time_together'];
