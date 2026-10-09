/**
 * Partner 2.0 P3 - owner receipt, one-tap reaction, partner's tiny response,
 * and the noise reduction on the Home screens.
 */
import {
  RECEIPT_COPY,
  REACTION_OPTIONS,
  ACTION_VISIBILITY_NOTE_FA,
  OWNER_VISIBLE_KINDS,
  partnerResponseLine,
  REACTION_SENT_FA,
} from '../screens/home/supportReceipt';
import { SUPPORT_ACTIONS, MESSAGE_PREFILL_FA } from '../screens/home/supportActions';

declare const __dirname: string;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8') as string;

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2764}]/u;

describe('receipt copy', () => {
  it('exists for exactly the allowlisted gestures, never give-space or message', () => {
    expect(Object.keys(RECEIPT_COPY).sort()).toEqual(['checked_in', 'time_together']);
    expect([...OWNER_VISIBLE_KINDS].sort()).toEqual(['checked_in', 'time_together']);
    expect(OWNER_VISIBLE_KINDS).not.toContain('gave_space');
    expect(OWNER_VISIBLE_KINDS).not.toContain('message');
  });

  it('is warm, optional and honest: no pressure, no completion claims, no health', () => {
    for (const { title, body } of Object.values(RECEIPT_COPY)) {
      const text = `${title}${body}`;
      expect(text).toMatch(/[؀-ۿ]/);
      expect(text).not.toMatch(/[A-Za-z0-9]/);
      expect(text).not.toMatch(EMOJI);
      // never pressure
      expect(text).not.toMatch(/منتظر|جواب بده!|حتماً|باید|فوری|یادآوری|هنوز جواب/);
      // never health / context
      expect(text).not.toMatch(/دوره|پریود|درد|علائم|خلق|انرژی|فاز|باردار|سلامت|حال بد/);
      // never claims something happened
      expect(text).not.toMatch(/گذراند|وقت گذاشت|انجام داد/);
    }
  });

  it('time_together is an intention, not a claim of time spent', () => {
    expect(RECEIPT_COPY.time_together.title).toMatch(/دلش می‌خواد/);
  });

  it('reactions are three small one-tap options using icons, never emoji', () => {
    expect(REACTION_OPTIONS.map((o) => o.value)).toEqual(['heart', 'thanks', 'hug']);
    for (const o of REACTION_OPTIONS) {
      expect(o.icon).toMatch(/^[a-z-]+$/);
      expect(`${o.label}${o.icon}`).not.toMatch(EMOJI);
    }
    expect(REACTION_SENT_FA).not.toMatch(EMOJI);
  });
});

describe('partner response', () => {
  it('is tiny, past tense, no owner data', () => {
    const line = partnerResponseLine({ reaction: 'heart', action: 'checked_in' });
    expect(line).not.toBeNull();
    expect(line!.text).toMatch(/فرستاد/);
    expect(line!.text).not.toMatch(EMOJI);
  });
  it('nothing when there is no reaction or an unknown one', () => {
    expect(partnerResponseLine(null)).toBeNull();
    expect(partnerResponseLine(undefined)).toBeNull();
    expect(partnerResponseLine({ reaction: 'angry', action: 'checked_in' })).toBeNull();
  });
});

describe('transparency to the partner', () => {
  it('give space is explicitly private; a message goes only when sent', () => {
    expect(ACTION_VISIBILITY_NOTE_FA.gave_space).toMatch(/چیزی نمی‌بیند/);
    expect(ACTION_VISIBILITY_NOTE_FA.message).toMatch(/تا خودت نفرستی/);
  });
  it('every support action has a visibility note', () => {
    for (const a of SUPPORT_ACTIONS) {
      expect(ACTION_VISIBILITY_NOTE_FA[a.value]).toBeTruthy();
    }
  });
  it('the message action still opens an editable draft and sends nothing', () => {
    expect(MESSAGE_PREFILL_FA).toMatch(/[؀-ۿ]/);
    const row = read('screens', 'home', 'components', 'SupportActionRow.tsx');
    expect(row).not.toMatch(/useSendMessage|sendMessage|messageService/);
  });
});

describe('owner card wiring (source contract)', () => {
  // Code only: strip comments so the header that explains what the card does
  // NOT do cannot trip the checks.
  const card = read('screens', 'home', 'components', 'SupportReceiptCard.tsx')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  const home = read('screens', 'home', 'HomeScreen.tsx');

  it('is one quiet card: no list, no polling, no counter, no reminder', () => {
    expect(card).not.toMatch(/FlatList|\.map\(\(r(eceipt)?\b/);
    expect(card).not.toMatch(/refetchInterval|setInterval|setTimeout/);
    expect(card).not.toMatch(/waiting|unread|streak|reminder|count/i);
  });

  it('has a no-pressure way out and a one-tap reaction', () => {
    expect(card).toMatch(/useReactToSupportReceipt/);
    expect(card).toMatch(/useDismissSupportReceipt/);
    expect(card).toMatch(/RECEIPT_LATER_FA/);
  });

  it('renders nothing without a receipt', () => {
    expect(card).toMatch(/if \(!receipt && !sent\) \{ return null; \}/);
  });

  it('carries no health or partner-context imports', () => {
    expect(card).not.toMatch(/usePartnerToday|useProfile|today\.|cycle|mood|symptom/i);
  });

  it('is mounted once on the owner Home', () => {
    expect((home.match(/<SupportReceiptCard \/>/g) ?? []).length).toBe(1);
  });
});

describe('the receipt hook is not a feed or a notifier', () => {
  const hook = read('hooks', 'queries', 'useIntelligence.ts');
  const body = hook.slice(hook.indexOf('export function useSupportReceipt'), hook.indexOf('export function useReactToSupportReceipt'));
  it('no polling and no retry storms', () => {
    expect(body).not.toMatch(/refetchInterval/);
    expect(body).toMatch(/retry: false/);
  });
  it('no push or notification code was added for receipts', () => {
    const push = read('services', 'pushNotifications.ts');
    expect(push).not.toMatch(/support_receipt|SupportReceipt/);
  });
});

describe('check-in answers never become receipts', () => {
  it('PartnerHome logs the check-in action with origin check_in', () => {
    const src = read('screens', 'home', 'PartnerHomeScreen.tsx');
    expect(src).toMatch(/logPartnerAction\(\{ action: 'checked_in', origin: 'check_in' \}\)/);
  });
  it('the chip path uses the default (chip) origin', () => {
    const svc = read('api', 'services', 'intelligenceService.ts');
    expect(svc).toMatch(/origin: 'chip' \| 'check_in' = 'chip'/);
  });
});

describe('noise: fewer generic blocks, no new ones', () => {
  const partner = read('screens', 'home', 'PartnerHomeScreen.tsx');
  const home = read('screens', 'home', 'HomeScreen.tsx');
  const ledger = read('screens', 'home', 'components', 'AccrualLedger.tsx');

  it('partner: generic phase education only in the quiet state, the action list only with a real signal', () => {
    expect(partner).toMatch(/!hasReflection && isQuiet && payload\.general_context/);
    expect(partner).toMatch(/!hasReflection && !isQuiet && payload\.suggestions\.length > 0/);
    // never both at once
    expect(partner).toMatch(/const isQuiet = payload\.themes\.every/);
  });

  it('owner: one prompt to log instead of two overlapping, and education yields to a real prompt', () => {
    // the adaptive card yields ONLY to a live missing_data prompt (which opens it)
    expect(home).toMatch(/!checkInPromptOffersAdaptive \? <DailyCheckInCard/);
    expect(home).toMatch(/kind === 'missing_data' && today\.check_in\.state === 'shown'/);
    expect(home).toMatch(/\{!today\?\.check_in \? \(\s*<View style=\{\{ marginTop: spacing\[4\] \}\}>\s*<KnowledgeCard/);
  });

  it('the repeated static ledger sentence is gone', () => {
    expect(ledger).not.toMatch(/هر روز که ثبت می‌کنی/);
  });

  it('no new informational block was added to either Home besides the single receipt card', () => {
    expect((home.match(/<[A-Z][A-Za-z]+Card\b/g) ?? []).filter((t) => t !== '<SupportReceiptCard').length)
      .toBe((home.match(/<[A-Z][A-Za-z]+Card\b/g) ?? []).length - 1);
  });
});
