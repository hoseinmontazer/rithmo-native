/**
 * M6 Learning Timeline contract.
 *
 * Same discipline as homeStory.test.ts / insightDetail.test.ts: mirror the
 * screen's DATA logic as plain functions, never render the native screen.
 * The seven required states from the M6 spec map directly onto the
 * describe blocks below.
 */

import { signalLabel } from '@i18n';
import type { EpistemicKind, Insight, InsightConfidence } from '@types/intelligence.types';

function insight(over: Partial<Insight> = {}): Insight {
  return {
    key: 'phase:energy:luteal:down',
    kind: 'phase',
    confidence: 'repeated',
    confidence_label_fa: 'الگوی تکرارشونده',
    epistemic_kind: 'pattern',
    epistemic_kind_label_fa: 'الگوی تکرارشونده',
    title_fa: 'انرژی شما در فاز لوتئال پایین‌تر است',
    body_fa: 'در ۳ روز ثبت‌شده از ۳ چرخه، میانگین انرژی در فاز لوتئال پایین‌تر بوده است.',
    evidence: {},
    related_signals: ['energy', 'cycle_phase'],
    window_days: 90,
    priority: 55,
    ...over,
  };
}

/** Mirrors LearningTimelineScreen.orderLearned — presentation-only sort. */
const EPISTEMIC_RANK: Record<EpistemicKind, number> = { pattern: 2, hypothesis: 1, observation: 0 };
const CONFIDENCE_RANK: Record<InsightConfidence, number> = { established: 3, repeated: 2, emerging: 1, insufficient: 0 };

function orderLearned(insights: Insight[]): Insight[] {
  return insights
    .filter((i) => i.kind !== 'coverage' && i.epistemic_kind !== null)
    .slice()
    .sort((a, b) => {
      const byKind = EPISTEMIC_RANK[b.epistemic_kind as EpistemicKind] - EPISTEMIC_RANK[a.epistemic_kind as EpistemicKind];
      if (byKind !== 0) { return byKind; }
      return CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
    });
}

/** Mirrors LearningTimelineScreen.evolvedContext — only what first_seen /
 * times_seen / peak_confidence can prove, never a fabricated date list. */
function evolvedContext(ins: Insight): string | null {
  const parts: string[] = [];
  if (ins.first_seen) { parts.push('first_seen'); }
  if (ins.times_seen && ins.times_seen > 1) { parts.push('times_seen'); }
  if (parts.length === 0) { return null; }
  let text = parts.join(';');
  if (ins.peak_confidence && ins.peak_confidence !== ins.confidence &&
      CONFIDENCE_RANK[ins.peak_confidence] > CONFIDENCE_RANK[ins.confidence]) {
    text += ';higher_peak';
  }
  return text;
}

describe('State 1 — no meaningful insight history', () => {
  it('an empty insight list and no learning signals is the empty state, not a fake list', () => {
    const learned = orderLearned([]);
    const learning: string[] = [];
    expect(learned).toEqual([]);
    expect(learning).toEqual([]);
    // The screen's own isEmpty = learned.length===0 && learning.length===0
    expect(learned.length === 0 && learning.length === 0).toBe(true);
  });

  it('a coverage-only list (Learning Mode) is still the empty state — coverage is never "learned"', () => {
    const learned = orderLearned([insight({ kind: 'coverage', epistemic_kind: null, confidence: 'insufficient' })]);
    expect(learned).toEqual([]);
  });
});

describe('State 2 — observation exists', () => {
  const obs = insight({
    kind: 'deviation',
    epistemic_kind: 'observation',
    epistemic_kind_label_fa: 'مشاهده',
    confidence: 'emerging',
  });

  it('is included and carries the observation label', () => {
    const [found] = orderLearned([obs]);
    expect(found.epistemic_kind).toBe('observation');
    expect(found.epistemic_kind_label_fa).toBe('مشاهده');
  });

  it('ranks below any hypothesis or pattern present', () => {
    const pattern = insight({ key: 'a', epistemic_kind: 'pattern', confidence: 'established' });
    const hypothesis = insight({ key: 'b', epistemic_kind: 'hypothesis', confidence: 'emerging' });
    const ordered = orderLearned([obs, pattern, hypothesis]);
    expect(ordered.map((i) => i.epistemic_kind)).toEqual(['pattern', 'hypothesis', 'observation']);
  });
});

describe('State 3 — hypothesis exists', () => {
  const hyp = insight({
    kind: 'recurrence',
    confidence: 'emerging',
    confidence_label_fa: 'نشانه‌ی اولیه',
    epistemic_kind: 'hypothesis',
    epistemic_kind_label_fa: 'فرضیه',
    evidence: { type: 'cross_cycle_recurrence', cycles_observed: 2, cycles_matched: 2 },
  });

  it('is labeled a hypothesis, never a confirmed pattern', () => {
    const [found] = orderLearned([hyp]);
    expect(found.epistemic_kind).toBe('hypothesis');
    expect(found.epistemic_kind_label_fa).not.toBe('الگوی تکرارشونده');
    expect(found.confidence_label_fa).not.toBe('الگوی تثبیت‌شده');
  });
});

describe('State 4 — established pattern', () => {
  const pattern = insight({
    kind: 'recurrence',
    confidence: 'established',
    confidence_label_fa: 'الگوی تثبیت‌شده',
    epistemic_kind: 'pattern',
    epistemic_kind_label_fa: 'الگوی تکرارشونده',
    evidence: { type: 'cross_cycle_recurrence', cycles_observed: 3, cycles_matched: 3, recurrence_ratio: 1.0 },
    body_fa: 'در ۳ مورد از ۳ چرخه‌ی اخیر، انرژی شما در فاز لوتئال پایین‌تر از حالت معمول‌تان بوده است.',
  });

  it('preserves the N-of-M evidence in body_fa untouched (no client-side recomputation)', () => {
    const [found] = orderLearned([pattern]);
    expect(found.body_fa).toContain('۳ مورد از ۳ چرخه');
    expect(found.evidence).toEqual(pattern.evidence);
  });

  it('ranks first among mixed states', () => {
    const hyp = insight({ key: 'h', epistemic_kind: 'hypothesis', confidence: 'emerging' });
    const ordered = orderLearned([hyp, pattern]);
    expect(ordered[0].key).toBe(pattern.key);
  });
});

describe('State 5 — multiple insight states together', () => {
  const a = insight({ key: 'a', epistemic_kind: 'pattern', confidence: 'established' });
  const b = insight({ key: 'b', epistemic_kind: 'pattern', confidence: 'repeated' });
  const c = insight({ key: 'c', epistemic_kind: 'hypothesis', confidence: 'emerging' });
  const d = insight({ key: 'd', epistemic_kind: 'observation', confidence: 'emerging' });

  it('produces a stable, deterministic order: pattern (established > repeated), then hypothesis, then observation', () => {
    expect(orderLearned([d, c, b, a]).map((i) => i.key)).toEqual(['a', 'b', 'c', 'd']);
    // Same input, reordered — same output. Order comes from the data, not
    // from array position.
    expect(orderLearned([a, b, c, d]).map((i) => i.key)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('never duplicates or drops an insight', () => {
    const ordered = orderLearned([a, b, c, d]);
    expect(ordered).toHaveLength(4);
    expect(new Set(ordered.map((i) => i.key)).size).toBe(4);
  });

  it('does not throw on an empty or single-item list', () => {
    expect(() => orderLearned([])).not.toThrow();
    expect(() => orderLearned([a])).not.toThrow();
  });
});

describe('State 6 — missing or partial historical fields', () => {
  it('renders no evolved-context line when first_seen and times_seen are both absent', () => {
    expect(evolvedContext(insight({ first_seen: undefined, times_seen: undefined }))).toBeNull();
  });

  it('renders only what is present — times_seen without a peak_confidence bump', () => {
    const ctx = evolvedContext(insight({ first_seen: '2026-08-01', times_seen: 1, peak_confidence: undefined }));
    expect(ctx).toContain('first_seen');
    expect(ctx).not.toContain('times_seen'); // times_seen===1 is not "seen again"
    expect(ctx).not.toContain('higher_peak');
  });

  it('never claims a higher peak than actually reached', () => {
    const ctx = evolvedContext(insight({ first_seen: '2026-08-01', confidence: 'established', peak_confidence: 'established' }));
    expect(ctx).not.toContain('higher_peak');
  });

  it('a genuinely higher historical peak is surfaced honestly', () => {
    const ctx = evolvedContext(insight({ first_seen: '2026-08-01', confidence: 'emerging', peak_confidence: 'established' }));
    expect(ctx).toContain('higher_peak');
  });

  it('missing evidence keys never crash ordering or filtering', () => {
    expect(() => orderLearned([insight({ evidence: {} }), insight({ key: 'x', evidence: undefined as any })])).not.toThrow();
  });
});

describe('"still learning" uses only real backend numbers (shared with InsightDetailScreen)', () => {
  function learningLines(learning: string[], progress: Record<string, { observations: number; required: number }>) {
    return learning.map((signal) => {
      const p = progress[signal];
      return p ? `${signalLabel(signal)} — ${p.observations}/${p.required}` : signalLabel(signal);
    });
  }

  it('never fabricates a required count for a signal with no progress entry', () => {
    const lines = learningLines(['sleep'], {});
    expect(lines).toEqual(['خواب']);
    expect(lines[0]).not.toMatch(/\d/);
  });
});
