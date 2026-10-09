/**
 * Navigation targets for the Partner Guide, kept free of React so what each tap
 * opens is testable.
 *
 * `draftRoute` is the SAME route and params the Partner 2.0 P2 "message" action
 * uses (SupportActionRow.openChat): the real conversation with an editable
 * `prefill` draft and `initial: false` so "back" returns to the inbox. Opening
 * it sends nothing and records nothing; a guide starter is never sent for the
 * partner.
 */
import type { PartnerGuideSection } from './partnerGuideContent';

export function guideRoute(section: PartnerGuideSection) {
  return { name: 'PartnerGuide' as const, params: { section } };
}

export interface ChatTarget {
  partnerId: string;
  partnerName: string;
}

export function draftRoute(target: ChatTarget, text: string) {
  return [
    'ProfileTab',
    {
      screen: 'PartnerMessages',
      params: {
        screen: 'Conversation',
        params: { ...target, prefill: text },
        initial: false,
      },
    },
  ] as const;
}
