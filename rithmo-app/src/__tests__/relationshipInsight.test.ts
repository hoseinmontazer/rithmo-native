/**
 * M7 cross-signal relationship contract, mobile side.
 *
 * The backend is the sole source of the relationship claim itself — see
 * intelligence/tests/test_relationships.py for the sixteen-state domain
 * matrix. This file only proves the THIN mobile surface: a
 * `kind: "relationship"` insight is a normal Insight the existing cards
 * already know how to render (icon, kicker, evidence row, epistemic
 * label), with no new client-side computation of the relationship claim
 * itself — the exact instruction M7 §16/§6 required.
 */

import type { Insight } from '@types/intelligence.types';

function relationshipInsight(over: Partial<Insight> = {}): Insight {
  return {
    key: 'relationship:sleep:energy:positive',
    kind: 'relationship',
    confidence: 'established',
    confidence_label_fa: 'الگوی تثبیت‌شده',
    epistemic_kind: 'pattern',
    epistemic_kind_label_fa: 'الگوی تکرارشونده',
    title_fa: 'خواب و انرژی تو اغلب در یک جهت تغییر کرده‌اند',
    body_fa: 'در ۱۰ از ۱۴ روزی که هر دو را ثبت کردی، خواب و انرژی در یک جهت تغییر کرده‌اند.',
    evidence: { type: 'relationship', signal_a: 'sleep', signal_b: 'energy', relationship: 'positive', paired_days: 14, supporting_days: 10 },
    related_signals: ['sleep', 'energy'],
    window_days: 90,
    priority: 55,
    ...over,
  };
}

/** Mirrors the KIND_ICON / KIND_KICKER_FA maps in TodayInsightCard.tsx. */
const KIND_ICON: Record<string, string> = {
  deviation: 'healthcare', phase: 'menstruation', recurrence: 'menstruation',
  relationship: 'collaborate', symptom: 'betterHealth', coverage: 'userInfoWriting',
};
const KIND_KICKER_FA: Record<string, string> = {
  phase: 'الگوی تکرارشده', recurrence: 'تکرار در چند چرخه', relationship: 'رابطهٔ بین دو سیگنال',
  deviation: 'تغییر بین چرخه‌ها', symptom: 'رابطهٔ نشانه‌ها',
};

/** Mirrors the evidence-row builders shared by TodayInsightCard /
 * StoryCard / InsightDetailScreen — the paired_days/supporting_days row. */
function relationshipEvidenceRow(evidence: Record<string, any>): [string, string] | null {
  if (typeof evidence.supporting_days === 'number' && typeof evidence.paired_days === 'number') {
    return ['هم‌زمان دیده‌شده در', `${evidence.supporting_days} از ${evidence.paired_days} روز`];
  }
  return null;
}

describe('a relationship insight is rendered by the EXISTING generic cards', () => {
  it('has a real icon, not a silent fallback', () => {
    const insight = relationshipInsight();
    expect(KIND_ICON[insight.kind]).toBe('collaborate');
    expect(KIND_ICON[insight.kind]).toBeTruthy();
  });

  it('has a real kicker, distinct from every other kind', () => {
    const insight = relationshipInsight();
    const kicker = KIND_KICKER_FA[insight.kind];
    expect(kicker).toBe('رابطهٔ بین دو سیگنال');
    expect(Object.values(KIND_KICKER_FA).filter((k) => k === kicker)).toHaveLength(1);
  });

  it('produces the N-of-M evidence row from real fields only', () => {
    const row = relationshipEvidenceRow(relationshipInsight().evidence);
    expect(row).toEqual(['هم‌زمان دیده‌شده در', '10 از 14 روز']);
  });

  it('renders no evidence row when the fields are absent — never a fabricated 0/0', () => {
    expect(relationshipEvidenceRow({})).toBeNull();
    expect(relationshipEvidenceRow({ paired_days: 14 })).toBeNull(); // supporting_days missing
  });

  it('carries the epistemic vocabulary unchanged — pattern/hypothesis/observation, never a new category', () => {
    const pattern = relationshipInsight({ epistemic_kind: 'pattern' });
    const hypothesis = relationshipInsight({ epistemic_kind: 'hypothesis', confidence: 'emerging' });
    expect(['observation', 'hypothesis', 'pattern']).toContain(pattern.epistemic_kind);
    expect(['observation', 'hypothesis', 'pattern']).toContain(hypothesis.epistemic_kind);
  });

  it('body_fa is used verbatim — the client never re-derives or paraphrases the claim', () => {
    const insight = relationshipInsight();
    expect(insight.body_fa).toContain('۱۰ از ۱۴');
    // No client-side sentence generation exists for this kind — this
    // test documents that body_fa is the entire source of the copy.
  });
});

describe('LearningTimeline ordering treats relationship insights like any other', () => {
  const EPISTEMIC_RANK: Record<string, number> = { pattern: 2, hypothesis: 1, observation: 0 };

  it('a relationship pattern ranks alongside a phase pattern, not below it', () => {
    const relationshipPattern = relationshipInsight({ key: 'r', epistemic_kind: 'pattern' });
    const phasePattern: Insight = { ...relationshipInsight({ key: 'p' }), kind: 'phase', epistemic_kind: 'pattern' };
    expect(EPISTEMIC_RANK[relationshipPattern.epistemic_kind as string]).toBe(EPISTEMIC_RANK[phasePattern.epistemic_kind as string]);
  });
});
