/**
 * In-app feedback: validation, state classification, and the contracts that
 * keep it private (no goal, no analytics properties, success only on 2xx).
 */
import {
  FEEDBACK_CONTACT_HINT_FA,
  FEEDBACK_DUPLICATE_FA,
  FEEDBACK_ERROR_FA,
  FEEDBACK_SUCCESS_FA,
  FEEDBACK_TEXT_MAX,
  FEEDBACK_TOPICS,
  INITIAL_FEEDBACK,
  classifyFeedbackError,
  successMessage,
  validateFeedback,
} from '../screens/support/feedbackLogic';

export {};
declare const __dirname: string;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
const read = (...p: string[]): string => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');

describe('topics', () => {
  it('are exactly the six categories the backend accepts', () => {
    expect(FEEDBACK_TOPICS.map((t) => t.value).sort()).toEqual(
      ['avoid_pregnancy', 'cycle_tracking', 'other', 'partner_experience', 'pricing', 'ttc'],
    );
  });
});

describe('validateFeedback', () => {
  it('starts with no topic, empty text and contact permission OFF', () => {
    expect(INITIAL_FEEDBACK).toEqual({ topic: null, text: '', contactOk: false });
  });
  it('requires a topic', () => {
    const r = validateFeedback(INITIAL_FEEDBACK);
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.field).toBe('topic'); }
  });
  it('text is optional: topic alone is valid and sends no text key', () => {
    const r = validateFeedback({ topic: 'other', text: '   ', contactOk: false });
    expect(r).toEqual({ ok: true, request: { category: 'other', contact_ok: false } });
  });
  it('trims text and always sends contact_ok as an explicit boolean', () => {
    const r = validateFeedback({ topic: 'pricing', text: '  hi  ', contactOk: true });
    expect(r).toEqual({ ok: true, request: { category: 'pricing', text: 'hi', contact_ok: true } });
  });
  it('enforces the 1000-character limit', () => {
    expect(validateFeedback({ topic: 'other', text: 'x'.repeat(FEEDBACK_TEXT_MAX), contactOk: false }).ok).toBe(true);
    const r = validateFeedback({ topic: 'other', text: 'x'.repeat(FEEDBACK_TEXT_MAX + 1), contactOk: false });
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.field).toBe('text'); }
  });
  it('rejects an unknown topic', () => {
    expect(validateFeedback({ topic: 'billing' as never, text: '', contactOk: false }).ok).toBe(false);
  });
  it('never carries a goal or any extra key', () => {
    const r = validateFeedback({ topic: 'ttc', text: 'a', contactOk: false, goal: 'avoid_pregnancy' } as never);
    expect(r.ok && Object.keys(r.request).sort()).toEqual(['category', 'contact_ok', 'text']);
  });
});

describe('error + success states', () => {
  const http = (status: number) => ({ response: { status } });
  it('classifies rate-limit, validation, unauthorized, server and offline', () => {
    expect(classifyFeedbackError(http(429))).toBe('rate_limited');
    expect(classifyFeedbackError(http(400))).toBe('validation');
    expect(classifyFeedbackError(http(401))).toBe('unauthorized');
    expect(classifyFeedbackError(http(503))).toBe('server');
    expect(classifyFeedbackError({ message: 'Network Error' })).toBe('offline');
    for (const k of Object.keys(FEEDBACK_ERROR_FA)) {
      expect(FEEDBACK_ERROR_FA[k as keyof typeof FEEDBACK_ERROR_FA]).toMatch(/[؀-ۿ]/);
    }
  });
  it('offline copy tells the user the text was kept', () => {
    expect(FEEDBACK_ERROR_FA.offline).toMatch(/متنت همین‌جا مانده/);
  });
  it('a duplicate answer is explained, a normal answer is a plain thank-you', () => {
    expect(successMessage({ duplicate: true })).toBe(FEEDBACK_DUPLICATE_FA);
    expect(successMessage({ duplicate: false })).toBe(FEEDBACK_SUCCESS_FA);
    expect(FEEDBACK_DUPLICATE_FA).not.toBe(FEEDBACK_SUCCESS_FA);
  });
  it('contact hint says it is optional and asks for nothing new', () => {
    expect(FEEDBACK_CONTACT_HINT_FA).toMatch(/اختیاری/);
    expect(FEEDBACK_CONTACT_HINT_FA).toMatch(/اطلاعات تماس جدیدی ثبت نمی‌شود/);
  });
});

describe('screen + wiring contracts', () => {
  const screen = read('screens', 'support', 'FeedbackScreen.tsx');
  const logic = read('screens', 'support', 'feedbackLogic.ts');

  it('success is set only after the awaited request resolves', () => {
    const send = screen.slice(screen.indexOf('const onSend'));
    expect(send.indexOf('setDone(')).toBeGreaterThan(send.indexOf('await submit.mutateAsync'));
    expect(send.indexOf("track('feedback_submitted')")).toBeGreaterThan(send.indexOf('await submit.mutateAsync'));
    expect(send.match(/setDone\(/g)).toHaveLength(1);
  });

  it('blocks a second tap synchronously while a request is in flight', () => {
    const send = screen.slice(screen.indexOf('const onSend'));
    expect(send).toMatch(/if \(inFlight\.current\) \{ return; \}/);
    expect(send.indexOf('inFlight.current = true')).toBeLessThan(send.indexOf('await submit.mutateAsync'));
    expect(screen).toMatch(/loading=\{sending\} disabled=\{sending\}/);
    expect(read('hooks', 'queries', 'useSupport.ts')).toMatch(/retry: false/);
  });

  it('keeps the typed text on failure (form state is never reset in the catch)', () => {
    const catchBlock = screen.slice(screen.indexOf('} catch (e)'), screen.indexOf('} finally'));
    expect(catchBlock).not.toMatch(/setForm|INITIAL_FEEDBACK/);
  });

  it('feedback events are property-free and fire once per mount / confirmed submit', () => {
    expect(screen.match(/track\('feedback_opened'\)/g)).toHaveLength(1);
    expect(screen.match(/track\('feedback_submitted'\)/g)).toHaveLength(1);
    expect(screen).not.toMatch(/track\('feedback_[a-z]+',/);
    expect(screen).toMatch(/opened\.current/);
  });

  it('never reads or sends the reproductive goal, and never logs', () => {
    // identifiers only (the header comment is allowed to say it does not use the goal)
    expect(screen + logic).not.toMatch(/reproductive[A-Z_]|ReproductiveGoal|goal_/);
    expect(screen + logic).not.toMatch(/console\./);
  });

  it('posts to the feedback endpoint, with no Premium gate', () => {
    expect(read('constants', 'config.ts')).toMatch(/SUPPORT_FEEDBACK: '\/api\/support\/feedback\/'/);
    expect(screen).not.toMatch(/usePremiumStatus|useSubscription|Upgrade/);
  });

  it('feedback tickets are labelled in the existing ticket list', () => {
    expect(read('screens', 'support', 'SupportScreen.tsx')).toMatch(/FEEDBACK_TOPICS\.find/);
    expect(read('types', 'support.types.ts')).toMatch(/'cycle_tracking'/);
  });

  it('Profile exposes feedback to every account (not gated on owner)', () => {
    const profile = read('screens', 'profile', 'ProfileScreen.tsx');
    const at = profile.indexOf("navigate('Feedback')");
    expect(at).toBeGreaterThan(-1);
    // The owner-only wrapper (history + goal rows) must have closed before the
    // feedback row, so partners and male accounts still get it.
    const goalAt = profile.indexOf('label="هدف من"');
    const wrapperClose = profile.indexOf('        )}', goalAt);
    expect(wrapperClose).toBeGreaterThan(goalAt);
    expect(wrapperClose).toBeLessThan(at);
  });
});
