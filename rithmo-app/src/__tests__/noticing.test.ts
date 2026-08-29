/**
 * Noticing on Home — the mobile-side contract.
 *
 * The backend (`intelligence/domain/noticing.py` + services.py's
 * precedence comment) decides which signal/mechanism a Noticing concerns,
 * and whether a real Insight should be shown instead. This file only
 * proves the THIN client contract, mirroring StoryCard.tsx's actual
 * branching logic as a plain function — same convention as
 * relationshipInsight.test.ts/learningTimeline.test.ts: no rendering, no
 * re-derivation of a decision the server already made.
 */

import type { GeneralPhaseContext, Insight, NoticingPayload } from '@types/intelligence.types';

function noticing(over: Partial<NoticingPayload> = {}): NoticingPayload {
  return {
    key: 'noticing:signal:mood:one_point',
    mechanism: 'signal',
    tier: 'one_point',
    headline_fa: 'اولین ثبتت برای خلق را دارم: ۳.',
    basis: { signal: 'mood', value: 3 },
    related_signals: ['mood'],
    onboarding_reference: null,
    ...over,
  };
}

function coverageInsight(over: Partial<Insight> = {}): Insight {
  return {
    key: 'coverage:logs',
    kind: 'coverage',
    confidence: 'insufficient',
    confidence_label_fa: 'داده کافی نیست',
    epistemic_kind: null,
    epistemic_kind_label_fa: '',
    title_fa: 'هنوز در حال شناختن الگوی تو هستم',
    body_fa: 'هنوز در حال شناختن الگوی توام.',
    evidence: { type: 'coverage' },
    related_signals: [],
    window_days: null,
    priority: 100,
    ...over,
  };
}

function realInsight(over: Partial<Insight> = {}): Insight {
  return {
    key: 'deviation:mood:below',
    kind: 'deviation',
    confidence: 'emerging',
    confidence_label_fa: 'نشانه اولیه',
    epistemic_kind: 'observation',
    epistemic_kind_label_fa: 'مشاهده',
    title_fa: 'خلق این روزها پایین‌تر از حالت معمول شماست',
    body_fa: '...',
    evidence: { type: 'baseline_comparison' },
    related_signals: ['mood'],
    window_days: 5,
    priority: 60,
    ...over,
  };
}

/** Mirrors StoryCard.tsx's headline branch exactly: noticing first, then
 * the real insight, never both. */
function selectHeadline(
  insight: Insight | null,
  noticingPayload: NoticingPayload | null,
): { kind: 'noticing' | 'insight' | 'none'; text: string | null } {
  if (noticingPayload) { return { kind: 'noticing', text: noticingPayload.headline_fa }; }
  if (insight) { return { kind: 'insight', text: insight.title_fa }; }
  return { kind: 'none', text: null };
}

/** Mirrors StoryCard.tsx's generalContext gate: only shown when there is
 * neither a Noticing sentence nor (implicitly) a real insight to lead
 * with — general knowledge never competes with either. */
function shouldShowGeneralContext(
  noticingPayload: NoticingPayload | null,
  learningMode: boolean,
  generalContext: GeneralPhaseContext | null,
): boolean {
  return !noticingPayload && learningMode && Boolean(generalContext);
}

/** Mirrors StoryCard.tsx's "nothing at all" early return. */
function isCardEmpty(insight: unknown, action: unknown, noticingPayload: unknown): boolean {
  return !insight && !action && !noticingPayload;
}

const GENERAL_CONTEXT: GeneralPhaseContext = {
  phase: 'follicular',
  general_context_fa: ['یک واقعیت عمومی درباره این فاز.'],
  suggested_logging: ['sleep'],
};

describe('TodayPayload accepts noticing', () => {
  it('a NoticingPayload satisfies the type, and null is a valid value too', () => {
    const present: NoticingPayload | null = noticing();
    const absent: NoticingPayload | null = null;
    expect(present.mechanism).toBe('signal');
    expect(absent).toBeNull();
  });
});

describe('StoryCard headline selection', () => {
  it('chooses the real Insight when noticing is null', () => {
    const result = selectHeadline(realInsight(), null);
    expect(result).toEqual({ kind: 'insight', text: realInsight().title_fa });
  });

  it('chooses Noticing over the generic coverage insight when both are present', () => {
    // This is the exact shape the server sends throughout Learning Mode:
    // `primary_insight` is still the coverage insight, but `noticing` is
    // also present — the client must prefer noticing, never render both.
    const result = selectHeadline(coverageInsight(), noticing());
    expect(result).toEqual({ kind: 'noticing', text: noticing().headline_fa });
  });

  it('never renders the insight title when noticing is present, even for a non-coverage insight', () => {
    // Should not happen per the server's own contract (a real insight
    // means noticing is null), but the client's own selection logic must
    // still resolve deterministically to noticing first if it ever did.
    const result = selectHeadline(realInsight(), noticing());
    expect(result.kind).toBe('noticing');
  });

  it('renders nothing when all three of insight, action and noticing are absent', () => {
    expect(isCardEmpty(null, null, null)).toBe(true);
  });

  it('renders the card when only noticing is present (the building-gap case, M8)', () => {
    expect(isCardEmpty(null, null, noticing())).toBe(false);
  });
});

describe('general phase context steps aside for Noticing', () => {
  it('shows general context during learning mode when there is no noticing', () => {
    expect(shouldShowGeneralContext(null, true, GENERAL_CONTEXT)).toBe(true);
  });

  it('hides general context once noticing exists, even in learning mode', () => {
    expect(shouldShowGeneralContext(noticing(), true, GENERAL_CONTEXT)).toBe(false);
  });

  it('never shows general context outside learning mode regardless of noticing', () => {
    expect(shouldShowGeneralContext(null, false, GENERAL_CONTEXT)).toBe(false);
  });
});

describe('mixed state — some signals graduated, others still noticed', () => {
  it('once ANY real insight exists for the day, the server sends noticing:null — the client renders only the insight, and per-signal "still learning" detail stays AccrualLedger\'s job, unchanged', () => {
    // No new client logic: this documents the existing division of
    // responsibility rather than re-implementing it.
    const result = selectHeadline(realInsight(), null);
    expect(result.kind).toBe('insight');
  });
});
