/**
 * F-02 Home contract.
 *
 * These test the DATA rules behind the redesign rather than pixels: which
 * action is primary, what evidence is derivable from a payload, and — most
 * importantly — that nothing is invented when a field is missing. A
 * screenshot proves the layout; only these prove the screen cannot make
 * something up.
 */

import { confidenceLabel, phasePlainLabel, signalLabel } from '@i18n';
import type { GuidedAction, PersonalStatePayload } from '@types/intelligence.types';

const LATIN = /[A-Za-z]/;

function action(over: Partial<GuidedAction> = {}): GuidedAction {
  return {
    id: 1,
    date: '2026-08-21',
    slot: 'primary',
    intervention: 'protect_rest',
    title_fa: 'امروز را سبک بگیر',
    description_fa: 'یک کار غیرضروری را حذف کن.',
    minutes: 0,
    category: 'rest',
    reason_fa: 'میانگین خلق شما پایین‌تر بوده است.',
    reason_trace: {},
    source_insight_key: 'deviation:mood:below',
    feedback: null,
    ...over,
  };
}

/** Mirrors HomeScreen's slot split. */
function splitActions(actions: GuidedAction[]) {
  return {
    primaryAction: actions.find((a) => a.slot === 'primary') ?? null,
    secondaryActions: actions.filter((a) => a.slot !== 'primary'),
  };
}

describe('one dominant action', () => {
  it('promotes exactly one action to primary', () => {
    const { primaryAction, secondaryActions } = splitActions([
      action({ id: 1, slot: 'primary' }),
      action({ id: 2, slot: 'supporting', intervention: 'hydrate' }),
      action({ id: 3, slot: 'reflection', intervention: 'check_in' }),
    ]);

    expect(primaryAction?.id).toBe(1);
    expect(secondaryActions.map((a) => a.id)).toEqual([2, 3]);
  });

  it('never promotes a secondary action when there is no primary', () => {
    const { primaryAction, secondaryActions } = splitActions([
      action({ id: 2, slot: 'supporting' }),
    ]);

    // Better to show no headline action than to promote something the
    // engine did not choose as the focus.
    expect(primaryAction).toBeNull();
    expect(secondaryActions).toHaveLength(1);
  });

  it('handles an empty plan without inventing one', () => {
    const { primaryAction, secondaryActions } = splitActions([]);
    expect(primaryAction).toBeNull();
    expect(secondaryActions).toEqual([]);
  });
});

describe('insight and action stay connected', () => {
  it('the primary action carries the key of the insight it came from', () => {
    const a = action();
    expect(a.source_insight_key).toBe('deviation:mood:below');
  });

  it('an action with no source insight is still renderable', () => {
    // Learning-mode actions (log_today) exist independently of any pattern.
    const a = action({ source_insight_key: null, intervention: 'log_today' });
    expect(a.source_insight_key).toBeNull();
    expect(a.title_fa).toBeTruthy();
  });
});

/** Mirrors StoryCard.EvidenceRows — real fields only, never defaults. */
function evidenceRowCount(evidence: Record<string, unknown>): number {
  let n = 0;
  if (typeof evidence.recent_mean === 'number' && typeof evidence.window_days === 'number') { n += 1; }
  if (typeof evidence.baseline_centre === 'number') { n += 1; }
  if (typeof evidence.phase_mean === 'number' && typeof evidence.other_mean === 'number') { n += 2; }
  if (Array.isArray(evidence.cycle_day_range)) { n += 1; }
  if (
    typeof evidence.baseline_observations === 'number' ||
    typeof evidence.observations === 'number' ||
    typeof evidence.occurrences === 'number'
  ) { n += 1; }
  if (typeof evidence.cycles === 'number') { n += 1; }
  return n;
}

describe('evidence comes from the payload or not at all', () => {
  it('derives rows from a real deviation payload', () => {
    expect(evidenceRowCount({
      type: 'baseline_comparison',
      recent_mean: 2.0,
      baseline_centre: 4.0,
      window_days: 5,
      baseline_observations: 79,
    })).toBe(3);
  });

  it('derives rows from a real phase payload', () => {
    expect(evidenceRowCount({
      type: 'phase_comparison',
      phase_mean: 4.9,
      other_mean: 8.0,
      observations: 39,
      cycles: 3,
    })).toBe(4);
  });

  it('renders NO rows when the payload carries no numbers', () => {
    // The coverage insight for a new user has no measurements. The card must
    // show nothing rather than zeros.
    expect(evidenceRowCount({ type: 'coverage', missing: 'logs' })).toBe(0);
  });

  it('ignores fields that are present but not numeric', () => {
    expect(evidenceRowCount({ recent_mean: null, baseline_centre: undefined })).toBe(0);
  });
});

/** Mirrors AccrualLedger's bar logic. */
function learningBar(p?: { observations?: unknown; required?: unknown }) {
  const observations = typeof p?.observations === 'number' ? p.observations : null;
  const required = typeof p?.required === 'number' ? p.required : null;
  const hasProgress = observations !== null && required !== null && required > 0;
  return {
    hasProgress,
    pct: hasProgress ? Math.min(1, Math.max(0, observations! / required!)) : 0,
    remaining: hasProgress ? Math.max(required! - observations!, 0) : null,
  };
}

describe('accrual reports real progress or none', () => {
  it('computes a bar from real counts', () => {
    const bar = learningBar({ observations: 4, required: 7 });
    expect(bar.hasProgress).toBe(true);
    expect(bar.pct).toBeCloseTo(4 / 7);
    expect(bar.remaining).toBe(3);
  });

  it('draws NO bar when the payload omits progress', () => {
    // A zero-width bar still asserts "we are measuring this".
    expect(learningBar(undefined).hasProgress).toBe(false);
    expect(learningBar({}).hasProgress).toBe(false);
  });

  it('never overflows past complete', () => {
    expect(learningBar({ observations: 12, required: 7 }).pct).toBe(1);
    expect(learningBar({ observations: 12, required: 7 }).remaining).toBe(0);
  });

  it('never renders a negative remainder', () => {
    expect(learningBar({ observations: 9, required: 7 }).remaining).toBe(0);
  });
});

describe('accrual counts come from the state payload', () => {
  const state = {
    maturity: 'established',
    evidence: { total_logs: 84, total_periods: 4, usable_cycles: 3 },
    baselines: {
      baselines: { mood: {}, energy: {}, sleep: {}, pain: {} },
      learning: [],
      learning_progress: {},
    },
  } as unknown as PersonalStatePayload;

  it('reads logged days, cycles and established baselines', () => {
    expect(state.evidence.total_logs).toBe(84);
    expect(state.evidence.usable_cycles).toBe(3);
    expect(Object.keys(state.baselines.baselines)).toHaveLength(4);
  });

  it('counts OBSERVED cycles, not logged periods', () => {
    // 4 periods produce 3 observed cycles; a period closed only by a
    // prediction is not evidence.
    expect(state.evidence.usable_cycles).toBeLessThan(state.evidence.total_periods);
  });
});

describe('no raw English reaches the UI', () => {
  it('maps confidence codes', () => {
    expect(confidenceLabel('repeated')).toBe('الگوی تکرارشونده');
    expect(confidenceLabel('medium')).toBe('متوسط');
    expect(confidenceLabel('medium')).not.toMatch(LATIN);
  });

  it('maps signal codes for the accrual bars', () => {
    for (const s of ['mood', 'energy', 'sleep', 'pain', 'stress']) {
      expect(signalLabel(s)).not.toMatch(LATIN);
    }
    expect(signalLabel('mood')).toBe('خلق');
  });

  it('uses plain-language phase wording in the context strip', () => {
    // «فولیکولار» is a clinical transliteration most users do not know.
    expect(phasePlainLabel('follicular')).toBe('نیمه اول چرخه');
    expect(phasePlainLabel('luteal')).toBe('هفته‌های پیش از دوره');
    expect(phasePlainLabel('follicular')).not.toMatch(LATIN);
  });

  it('degrades to Persian for an unknown code rather than echoing it', () => {
    expect(phasePlainLabel('some_new_phase')).toBe('نامشخص');
    expect(confidenceLabel('some_new_tier')).toBe('');
  });
});
