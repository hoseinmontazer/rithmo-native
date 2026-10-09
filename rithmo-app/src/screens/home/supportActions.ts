/**
 * Support actions: contracts and the pure logic behind SupportActionRow.
 *
 * What an action IS (Partner 2.0 P2): the partner CHOSE it, and the server
 * recorded that choice against their link. Nothing here knows whether the
 * real-world thing happened, so nothing here ever says "done" or "sent":
 *   - success means "recorded", and is only reported after the server said so;
 *   - "message" records the intention to reach out and then offers the real
 *     conversation. A message exists only when the partner sends it there.
 *
 * Kept free of React so the submit/duplicate/failure behavior is testable.
 */
import type { PartnerSupportAction } from '@analytics/types';

export interface ActionContract {
  value: PartnerSupportAction;
  label: string;
  /** Shown only AFTER the server recorded the choice: the real "what now". */
  guidance_fa: string;
  /** Only "message" has a next step: a real navigation, never a claim. */
  ctaLabel?: string;
}

export const SUPPORT_ACTIONS: ActionContract[] = [
  {
    value: 'message',
    label: 'یه پیام کوتاه بفرست',
    guidance_fa: 'یک پیام کوتاه و بدون انتظار پاسخ خاص، معمولاً شروع خوبی است.',
    ctaLabel: 'شروع گفتگو',
  },
  {
    value: 'checked_in',
    label: 'یادآوری کن کنارشی',
    guidance_fa: 'لازم نیست چیزی را حل کنی — گاهی فقط حضور داشتن کافی است.',
  },
  {
    value: 'time_together',
    label: 'براش وقت بذار',
    guidance_fa: 'حتی یک زمان کوتاه برای کنار هم بودن می‌تواند ارزشمند باشد.',
  },
  {
    value: 'gave_space',
    label: 'بهش فضا بده',
    guidance_fa: 'گاهی بهترین همراهی این است که بدون فشار یا انتظار پاسخ، کمی فضا بدهی.',
  },
];

/**
 * A neutral, static opener dropped into the message box as an editable DRAFT.
 * Never sent automatically, never generated, never about her health.
 */
export const MESSAGE_PREFILL_FA = 'سلام، امروز چطوری؟';

export const RECORDED_LABEL_FA = 'ثبت شد';
export const FAILED_LABEL_FA = 'ثبت نشد. اتصالت را بررسی کن و دوباره تلاش کن.';
export const RETRY_LABEL_FA = 'تلاش دوباره';

/** The linked conversation partner, in the shape the Conversation route needs. */
export function resolveChatTarget(
  partners: ReadonlyArray<Record<string, any>> | null | undefined,
): { partnerId: string; partnerName: string } | null {
  const first = partners?.[0];
  if (!first) { return null; }
  const partnerId = String(first.partner_user_id ?? first.id ?? first.user_id ?? '');
  if (!partnerId) { return null; }
  const partnerName =
    [first.first_name, first.last_name].filter(Boolean).join(' ').trim() ||
    first.username ||
    first.email ||
    `شریک ${partnerId.slice(0, 6)}`;
  return { partnerId, partnerName: String(partnerName) };
}

export interface RecordResult {
  action: string;
  recorded_at?: string;
  deduplicated?: boolean;
}

export interface RunSupportActionDeps {
  /** A request is already in flight: a repeated tap must do nothing. */
  pending: boolean;
  contract: ActionContract;
  /** Wraps the mutation: calls onSuccess / onError exactly once. */
  log: (
    action: PartnerSupportAction,
    cb: { onSuccess: (res: RecordResult) => void; onError: (err: unknown) => void },
  ) => void;
  track: (event: string, props: Record<string, unknown>) => void;
  onRecorded: (contract: ActionContract) => void;
  onFailed: (contract: ActionContract) => void;
}

/**
 * One tap. Returns false (and does nothing at all) while a request is in
 * flight. "selected" is tracked on tap; "recorded" and the visible success
 * state exist only after the server confirmed; a failure leaves no success
 * state behind and can simply be run again.
 */
export function runSupportAction(deps: RunSupportActionDeps): boolean {
  const { pending, contract, log, track, onRecorded, onFailed } = deps;
  if (pending) { return false; }
  track('partner_support_action_taken', { action: contract.value });
  log(contract.value, {
    onSuccess: (res) => {
      track('partner_support_action_recorded', {
        action: contract.value,
        deduplicated: Boolean(res?.deduplicated),
      });
      onRecorded(contract);
    },
    onError: () => onFailed(contract),
  });
  return true;
}
