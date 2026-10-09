/**
 * Partner 2.0 P2 - support action flow.
 *
 * Behavior of the pure submit logic (runSupportAction) plus source contracts
 * for the wiring. The rules under test:
 *   - success is reported only after the server confirmed;
 *   - a failure leaves no success state and can be retried;
 *   - a repeated tap while a request is in flight does nothing;
 *   - "message" opens the conversation with an editable draft and never sends.
 */
import {
  SUPPORT_ACTIONS,
  MESSAGE_PREFILL_FA,
  RECORDED_LABEL_FA,
  FAILED_LABEL_FA,
  resolveChatTarget,
  runSupportAction,
  type ActionContract,
  type RunSupportActionDeps,
} from '../screens/home/supportActions';

declare const __dirname: string;

const message = SUPPORT_ACTIONS.find((a) => a.value === 'message') as ActionContract;
const space = SUPPORT_ACTIONS.find((a) => a.value === 'gave_space') as ActionContract;

function harness(over: Partial<RunSupportActionDeps> & { outcome?: 'success' | 'error' | 'never'; deduplicated?: boolean } = {}) {
  const events: Array<[string, any]> = [];
  const recorded: string[] = [];
  const failed: string[] = [];
  const logCalls: string[] = [];
  const deps: RunSupportActionDeps = {
    pending: false,
    contract: space,
    log: (action, cb) => {
      logCalls.push(action);
      if (over.outcome === 'error') { cb.onError(new Error('network')); }
      else if (over.outcome !== 'never') {
        cb.onSuccess({ action, recorded_at: '2026-10-06T10:00:00Z', deduplicated: over.deduplicated ?? false });
      }
    },
    track: (event, props) => { events.push([event, props]); },
    onRecorded: (c) => { recorded.push(c.value); },
    onFailed: (c) => { failed.push(c.value); },
    ...over,
  };
  return { deps, events, recorded, failed, logCalls };
}

describe('runSupportAction', () => {
  it('success: selected is tracked, then recorded only after the server confirmed', () => {
    const h = harness({ contract: space });
    expect(runSupportAction(h.deps)).toBe(true);
    expect(h.logCalls).toEqual(['gave_space']);
    expect(h.events.map((e) => e[0])).toEqual([
      'partner_support_action_taken',
      'partner_support_action_recorded',
    ]);
    expect(h.events[1][1]).toEqual({ action: 'gave_space', deduplicated: false });
    expect(h.recorded).toEqual(['gave_space']);
    expect(h.failed).toEqual([]);
  });

  it('nothing is "recorded" while the request has not answered', () => {
    const h = harness({ outcome: 'never' });
    runSupportAction(h.deps);
    expect(h.events.map((e) => e[0])).toEqual(['partner_support_action_taken']);
    expect(h.recorded).toEqual([]);
    expect(h.failed).toEqual([]);
  });

  it('failure: no recorded event, no success state, reports the failure', () => {
    const h = harness({ outcome: 'error' });
    runSupportAction(h.deps);
    expect(h.events.map((e) => e[0])).not.toContain('partner_support_action_recorded');
    expect(h.recorded).toEqual([]);
    expect(h.failed).toEqual(['gave_space']);
  });

  it('retry after a failure runs again from scratch and can succeed', () => {
    const first = harness({ outcome: 'error' });
    runSupportAction(first.deps);
    const second = harness({ outcome: 'success' });
    expect(runSupportAction(second.deps)).toBe(true);
    expect(second.recorded).toEqual(['gave_space']);
  });

  it('a repeated tap while a request is in flight does nothing at all', () => {
    const h = harness({ pending: true });
    expect(runSupportAction(h.deps)).toBe(false);
    expect(h.logCalls).toEqual([]);
    expect(h.events).toEqual([]);
    expect(h.recorded).toEqual([]);
  });

  it('a server-deduplicated response is reported as such (still recorded)', () => {
    const h = harness({ deduplicated: true });
    runSupportAction(h.deps);
    expect(h.events[1][1].deduplicated).toBe(true);
    expect(h.recorded).toEqual(['gave_space']);
  });

  it('sends only the bounded action value - no health or relationship data', () => {
    const h = harness({ contract: message });
    runSupportAction(h.deps);
    expect(h.logCalls).toEqual(['message']);
    for (const [, props] of h.events) {
      expect(Object.keys(props).sort()).toEqual(
        expect.arrayContaining(['action']),
      );
      expect(JSON.stringify(props)).not.toMatch(/mood|energy|cycle|phase|symptom|note|recipient|user/i);
    }
  });
});

describe('contracts and copy', () => {
  it('exactly the four existing actions; only "message" has a next step', () => {
    expect(SUPPORT_ACTIONS.map((a) => a.value).sort()).toEqual(
      ['checked_in', 'gave_space', 'message', 'time_together'],
    );
    expect(SUPPORT_ACTIONS.filter((a) => a.ctaLabel).map((a) => a.value)).toEqual(['message']);
  });

  it('no action copy claims completion, delivery or sending', () => {
    for (const a of SUPPORT_ACTIONS) {
      expect(`${a.label}${a.guidance_fa}${a.ctaLabel ?? ''}`).not.toMatch(/ارسال شد|فرستاده شد|انجام شد|تمام شد/);
    }
    expect(RECORDED_LABEL_FA).toBe('ثبت شد');
    expect(FAILED_LABEL_FA).not.toMatch(/ثبت شد[^ن]/);
  });

  it('the prefill is neutral, static, Persian and contains no health content', () => {
    expect(MESSAGE_PREFILL_FA).toMatch(/[؀-ۿ]/);
    expect(MESSAGE_PREFILL_FA).not.toMatch(/[A-Za-z0-9]/);
    expect(MESSAGE_PREFILL_FA).not.toMatch(/دوره|پریود|درد|حال بد|علائم|بارور/);
  });

  it('resolveChatTarget: the linked partner, or null', () => {
    expect(resolveChatTarget([])).toBeNull();
    expect(resolveChatTarget(undefined)).toBeNull();
    expect(resolveChatTarget([{ partner_user_id: 7, username: 'sara' }]))
      .toEqual({ partnerId: '7', partnerName: 'sara' });
    expect(resolveChatTarget([{ partner_user_id: 7, first_name: 'Sara', last_name: 'K', username: 'x' }]))
      .toEqual({ partnerId: '7', partnerName: 'Sara K' });
    expect(resolveChatTarget([{ username: 'no-id' }])).toBeNull();
  });
});

describe('wiring (source contract)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path');
  const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8') as string;
  const row = read('screens', 'home', 'components', 'SupportActionRow.tsx');
  const conv = read('screens', 'messages', 'ConversationScreen.tsx');

  it('the row uses the pure submit logic and shows success only through onRecorded', () => {
    expect(row).toMatch(/runSupportAction\(/);
    expect(row).toMatch(/onRecorded: \(c\) => \{ setFailed\(null\); setActive\(c\); \}/);
    // no optimistic success outside the callback
    expect(row.match(/setActive\(/g)?.length).toBe(2); // onRecorded + onFailed(null)
  });

  it('a failure renders an error with a retry and never the success label', () => {
    expect(row).toMatch(/FAILED_LABEL_FA/);
    expect(row).toMatch(/RETRY_LABEL_FA/);
  });

  it('the message action opens the conversation with a draft and never sends', () => {
    expect(row).toMatch(/screen: 'Conversation'/);
    expect(row).toMatch(/prefill: MESSAGE_PREFILL_FA/);
    expect(row).not.toMatch(/useSendMessage|sendMessage|messageService/);
  });

  it('the conversation only seeds the input with the draft', () => {
    expect(conv).toMatch(/useState\(prefill \?\? ''\)/);
    // sending still happens only in the explicit send handler
    expect((conv.match(/sendMessage\(/g) ?? []).length).toBe(1);
  });

  it('no owner-facing surface was added in P2', () => {
    expect(row).not.toMatch(/useReceipt|useReaction|ActionHistory|useSupportHistory|ownerReceipt/);
  });
});
