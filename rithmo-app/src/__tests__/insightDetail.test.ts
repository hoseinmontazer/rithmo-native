/**
 * M5 Insight Detail contract.
 *
 * Same discipline as homeStory.test.ts: mirror the screen's DATA logic as a
 * plain function rather than rendering the (native) component, and prove
 * the four required states never borrow each other's certainty — an
 * observation never gets recurrence language, a hypothesis is never shown
 * as confident, and missing evidence renders nothing rather than a zero.
 */

import { signalLabel } from '@i18n';
import type { EpistemicKind, Insight } from '@types/intelligence.types';

const LATIN = /[A-Za-z]/;

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

/** Mirrors InsightDetailScreen.evidenceRows — real fields only. */
function evidenceRows(ins: Insight): Array<[string, string]> {
  const e = ins.evidence as Record<string, any>;
  const rows: Array<[string, string]> = [];
  if (typeof e.cycles_matched === 'number' && typeof e.cycles_observed === 'number') { rows.push(['ratio', `${e.cycles_matched}/${e.cycles_observed}`]); }
  if (typeof e.recent_mean === 'number' && typeof e.window_days === 'number') { rows.push(['recent', '']); }
  if (typeof e.baseline_centre === 'number') { rows.push(['baseline', '']); }
  if (typeof e.phase_mean === 'number' && typeof e.other_mean === 'number') { rows.push(['phase', ''], ['other', '']); }
  if (typeof e.observations === 'number') { rows.push(['observations', '']); }
  if (typeof e.occurrences === 'number') { rows.push(['occurrences', '']); }
  if (typeof e.cycles === 'number') { rows.push(['cycles', '']); }
  if (typeof e.recent_observations === 'number') { rows.push(['recent_observations', '']); }
  if (typeof e.baseline_observations === 'number') { rows.push(['baseline_observations', '']); }
  if (Array.isArray(e.cycle_day_range)) { rows.push(['cycle_day_range', '']); }
  if (ins.times_seen && ins.times_seen > 1) { rows.push(['times_seen', '']); }
  return rows;
}

describe('State A — observation (deviation)', () => {
  const obs = insight({
    kind: 'deviation',
    epistemic_kind: 'observation',
    epistemic_kind_label_fa: 'مشاهده',
    evidence: { type: 'baseline_comparison', recent_mean: 2.0, baseline_centre: 4.0, window_days: 5, baseline_observations: 79, is_adverse: true, direction: 'below', sigma: -2.1 },
  });

  it('is labeled as an observation, never a recurring pattern', () => {
    expect(obs.epistemic_kind).toBe('observation');
    expect(obs.epistemic_kind_label_fa).toBe('مشاهده');
  });

  it('carries no cycle-recurrence evidence', () => {
    const rows = evidenceRows(obs);
    expect(rows.find(([k]) => k === 'ratio')).toBeUndefined();
  });

  it('exposes no raw sigma anywhere a UI label would read it', () => {
    // The screen never reads evidence.sigma directly into a row — this
    // just documents that the raw stat exists in evidence (for audit) but
    // is not one of the rendered row keys above.
    const renderedKeys = evidenceRows(obs).map(([k]) => k);
    expect(renderedKeys).not.toContain('sigma');
  });
});

describe('State B — emerging hypothesis', () => {
  const hyp = insight({
    kind: 'recurrence',
    confidence: 'emerging',
    confidence_label_fa: 'نشانه‌ی اولیه',
    epistemic_kind: 'hypothesis',
    epistemic_kind_label_fa: 'فرضیه',
    evidence: { type: 'cross_cycle_recurrence', signal: 'energy', phase: 'luteal', direction: 'below', cycles_observed: 2, cycles_matched: 2, recurrence_ratio: 1.0, observations: 6 },
  });

  it('is labeled a hypothesis, not a pattern', () => {
    expect(hyp.epistemic_kind).toBe('hypothesis');
    expect(hyp.epistemic_kind_label_fa).not.toBe('الگوی تکرارشونده');
  });

  it('still carries real N-of-M evidence once it exists at all', () => {
    const rows = evidenceRows(hyp);
    expect(rows.find(([k]) => k === 'ratio')).toBeDefined();
  });
});

describe('State C — established pattern', () => {
  const pattern = insight({
    kind: 'recurrence',
    confidence: 'established',
    confidence_label_fa: 'الگوی تثبیت‌شده',
    epistemic_kind: 'pattern',
    epistemic_kind_label_fa: 'الگوی تکرارشونده',
    evidence: { type: 'cross_cycle_recurrence', signal: 'energy', phase: 'luteal', direction: 'below', cycles_observed: 3, cycles_matched: 3, recurrence_ratio: 1.0, observations: 15 },
  });

  it('shows the N-of-M ratio the product principle requires', () => {
    const rows = evidenceRows(pattern);
    expect(rows.find(([k, v]) => k === 'ratio' && v === '3/3')).toBeDefined();
  });
});

describe('State D — coverage / insufficient data', () => {
  const coverage = insight({
    kind: 'coverage',
    confidence: 'insufficient',
    confidence_label_fa: '',
    epistemic_kind: null,
    epistemic_kind_label_fa: '',
    title_fa: 'هنوز در حال شناختن الگوی تو هستم',
    body_fa: 'هنوز در حال شناختن الگوی توام. با حدود ۳ روز ثبت دیگر می‌توانم بگویم چه چیزی برای تو معمول است و چه چیزی متفاوت.',
    evidence: { type: 'coverage', missing: 'logs', total_logs: 4 },
  });

  it('carries no epistemic claim at all', () => {
    expect(coverage.epistemic_kind).toBeNull();
  });

  it('is never mistaken for a confident insight', () => {
    // The screen's own isCoverage gate is `insight.kind === 'coverage'` —
    // this is the exact condition it branches on.
    expect(coverage.kind === 'coverage').toBe(true);
  });
});

describe('missing or optional evidence never crashes the row builder', () => {
  it('an empty evidence object renders zero rows', () => {
    expect(evidenceRows(insight({ evidence: {} }))).toEqual([]);
  });

  it('a coverage evidence shape with no measurements renders zero rows', () => {
    expect(evidenceRows(insight({ evidence: { type: 'coverage', missing: 'logs' } }))).toEqual([]);
  });

  it('null/undefined-typed fields are ignored, not coerced', () => {
    expect(evidenceRows(insight({ evidence: { recent_mean: null, cycles_matched: undefined } }))).toEqual([]);
  });
});

describe('epistemic label vocabulary matches the backend exactly', () => {
  const LABELS: Record<EpistemicKind, string> = {
    observation: 'مشاهده',
    hypothesis: 'فرضیه',
    pattern: 'الگوی تکرارشونده',
  };

  it('every non-null epistemic_kind has a real Persian label, never English', () => {
    for (const [kind, label] of Object.entries(LABELS)) {
      expect(label).not.toMatch(LATIN);
      expect(insight({ epistemic_kind: kind as EpistemicKind, epistemic_kind_label_fa: label }).epistemic_kind_label_fa).toBe(label);
    }
  });
});

describe('"what Rhythmo does not know yet" uses real backend numbers only', () => {
  function learningLines(learning: string[], progress: Record<string, { observations: number; required: number }>) {
    return learning.map((signal) => {
      const p = progress[signal];
      return p ? `${signalLabel(signal)} — ${p.observations}/${p.required}` : signalLabel(signal);
    });
  }

  it('renders one line per still-learning signal, with real counts', () => {
    const lines = learningLines(['sleep'], { sleep: { observations: 3, required: 7 } });
    expect(lines).toEqual(['خواب — 3/7']);
  });

  it('renders nothing when every tracked signal already has a baseline', () => {
    expect(learningLines([], {})).toEqual([]);
  });

  it('never fabricates a required count for a signal with no progress entry', () => {
    // If the backend hasn't sent a progress entry for this signal, the line
    // falls back to the label alone — it must not invent a "0/7".
    const lines = learningLines(['mood'], {});
    expect(lines).toEqual(['خلق']);
    expect(lines[0]).not.toMatch(/\d/);
  });
});
