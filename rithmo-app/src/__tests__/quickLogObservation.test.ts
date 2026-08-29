/**
 * QuickLog's post-log reflection — the 'building'-state day-over-day
 * extension.
 *
 * Mirrors `QuickLogScreen.tsx`'s `deriveDataState`/`buildPostLogObservation`/
 * `derivePriorSameSignal`/`reportedOrNull` as plain, duplicated functions —
 * same convention as every other test in this project (no RNTL rendering,
 * no importing the screen's internals). The existing `>=5` average-based
 * branch (one_cycle/multi_cycle) is untouched by this feature and is not
 * re-tested here.
 */

type DataState = 'empty' | 'building' | 'one_cycle' | 'multi_cycle';

function deriveDataState(periodCount: number, logCount: number): DataState {
  if (periodCount === 0 && logCount < 3) { return 'empty'; }
  if (logCount < 5 || periodCount === 0) { return 'building'; }
  if (periodCount === 1) { return 'one_cycle'; }
  return 'multi_cycle';
}

interface PriorSameSignal {
  mood: number | null;
  energy: number | null;
}

interface MinimalLog {
  date: string;
  mood_level: number;
  energy_level: number;
  reported_fields?: string[] | null;
}

function reportedOrNull(log: MinimalLog, field: 'mood_level' | 'energy_level'): number | null {
  const reported = log.reported_fields;
  if (!Array.isArray(reported) || !reported.includes(field)) { return null; }
  return log[field];
}

function derivePriorSameSignal(recentLogs: MinimalLog[] | undefined, today: string): PriorSameSignal | null {
  if (!Array.isArray(recentLogs)) { return null; }
  const prior = recentLogs.find((l) => l.date !== today);
  if (!prior) { return null; }
  const moodVal = reportedOrNull(prior, 'mood_level');
  const energyRaw = reportedOrNull(prior, 'energy_level');
  if (moodVal === null && energyRaw === null) { return null; }
  return { mood: moodVal, energy: energyRaw !== null ? energyRaw / 2 : null };
}

function buildPostLogObservation(
  dataState: DataState,
  todayMood: number,
  todayEnergy: number,
  avgMood: number | null,
  avgEnergy: number | null,
  priorSameSignal?: PriorSameSignal | null,
): string | null {
  if (dataState === 'empty') {
    return 'ریتمو شروع می‌کنه به شناخت تو.';
  }
  if (dataState === 'building') {
    if (priorSameSignal && (priorSameSignal.mood !== null || priorSameSignal.energy !== null)) {
      const moodDiff = priorSameSignal.mood !== null ? todayMood - priorSameSignal.mood : null;
      const energyDiff = priorSameSignal.energy !== null ? todayEnergy - priorSameSignal.energy : null;

      if (moodDiff !== null && energyDiff !== null && moodDiff !== 0 && energyDiff !== 0) {
        const same = (moodDiff > 0) === (energyDiff > 0);
        if (same) {
          return `امروز خلق و انرژی‌ات نسبت به ثبت قبلی‌ات ${moodDiff > 0 ? 'بالاتر' : 'پایین‌تر'} بود.`;
        }
      }
      if (energyDiff !== null && energyDiff !== 0) {
        return `امروز انرژی‌ات نسبت به ثبت قبلی‌ات ${energyDiff > 0 ? 'بالاتر' : 'پایین‌تر'} بود.`;
      }
      if (moodDiff !== null && moodDiff !== 0) {
        return `امروز خلقت نسبت به ثبت قبلی‌ات ${moodDiff > 0 ? 'بالاتر' : 'پایین‌تر'} بود.`;
      }
      return 'خلق و انرژی‌ات مثل ثبت قبلی‌ات بود.';
    }
    return 'داریم الگو را می‌سازیم — چند روز دیگر صبر کن.';
  }

  const observations: string[] = [];

  if (avgMood !== null && avgEnergy !== null) {
    const moodDiff = todayMood - avgMood;
    const energyDiff = todayEnergy - avgEnergy;

    if (moodDiff <= -1.5 && energyDiff <= -1.5) {
      observations.push('امروز خلق و انرژی‌ات پایین‌تر از میانگین شخصی‌ات بود.');
    } else if (moodDiff >= 1.5 && energyDiff >= 1.5) {
      observations.push('امروز خلق و انرژی‌ات بالاتر از میانگین شخصی‌ات بود.');
    } else if (energyDiff <= -1.5) {
      observations.push('امروز انرژی‌ات پایین‌تر از میانگین اخیرت بود.');
    } else if (moodDiff <= -1.5) {
      observations.push('امروز خلقت پایین‌تر از میانگین اخیرت بود.');
    }
  }

  if (observations.length === 0) {
    return 'امروز هم ثبت شد.';
  }

  return observations[0];
}

const TODAY = '2026-06-01';
const YESTERDAY = '2026-05-31';
const NINE_DAYS_AGO = '2026-05-23';

describe('derivePriorSameSignal — provenance-gated, never a guess', () => {
  it('returns null with no recent logs at all', () => {
    expect(derivePriorSameSignal(undefined, TODAY)).toBeNull();
    expect(derivePriorSameSignal([], TODAY)).toBeNull();
  });

  it('skips a legacy log with no reported_fields at all rather than guessing', () => {
    const prior: MinimalLog = { date: YESTERDAY, mood_level: 3, energy_level: 6, reported_fields: null };
    expect(derivePriorSameSignal([prior], TODAY)).toBeNull();
  });

  it('skips a field the provenance record says was not entered', () => {
    const prior: MinimalLog = { date: YESTERDAY, mood_level: 3, energy_level: 6, reported_fields: ['energy_level'] };
    const result = derivePriorSameSignal([prior], TODAY);
    expect(result).toEqual({ mood: null, energy: 3 }); // 6 / 2
  });

  it('finds the most recent PRIOR day, skipping today\'s own (already-saved) log', () => {
    const todayLog: MinimalLog = { date: TODAY, mood_level: 5, energy_level: 10, reported_fields: ['mood_level', 'energy_level'] };
    const prior: MinimalLog = { date: YESTERDAY, mood_level: 2, energy_level: 4, reported_fields: ['mood_level', 'energy_level'] };
    const result = derivePriorSameSignal([todayLog, prior], TODAY);
    expect(result).toEqual({ mood: 2, energy: 2 });
  });
});

describe('buildPostLogObservation — building state, day-over-day extension', () => {
  it('does not compare with fewer than 2 same-signal observations (no prior at all)', () => {
    const obs = buildPostLogObservation('building', 3, 3, null, null, null);
    expect(obs).toBe('داریم الگو را می‌سازیم — چند روز دیگر صبر کن.');
  });

  it('does not compare when the only prior log has neither field reported', () => {
    const obs = buildPostLogObservation('building', 3, 3, null, null, { mood: null, energy: null });
    expect(obs).toBe('داریم الگو را می‌سازیم — چند روز دیگر صبر کن.');
  });

  it('compares to yesterday with exactly 2 real observations, both lower', () => {
    const obs = buildPostLogObservation('building', 2, 2, null, null, { mood: 4, energy: 4 });
    expect(obs).toBe('امروز خلق و انرژی‌ات نسبت به ثبت قبلی‌ات پایین‌تر بود.');
  });

  it('compares to yesterday with exactly 2 real observations, both higher', () => {
    const obs = buildPostLogObservation('building', 5, 5, null, null, { mood: 3, energy: 3 });
    expect(obs).toBe('امروز خلق و انرژی‌ات نسبت به ثبت قبلی‌ات بالاتر بود.');
  });

  it('reports only energy when mood is unavailable', () => {
    const obs = buildPostLogObservation('building', 3, 5, null, null, { mood: null, energy: 3 });
    expect(obs).toBe('امروز انرژی‌ات نسبت به ثبت قبلی‌ات بالاتر بود.');
  });

  it('reports only mood when energy is unavailable', () => {
    const obs = buildPostLogObservation('building', 5, 3, null, null, { mood: 3, energy: null });
    expect(obs).toBe('امروز خلقت نسبت به ثبت قبلی‌ات بالاتر بود.');
  });

  it('says "same as last log" when both values are identical', () => {
    const obs = buildPostLogObservation('building', 3, 3, null, null, { mood: 3, energy: 3 });
    expect(obs).toBe('خلق و انرژی‌ات مثل ثبت قبلی‌ات بود.');
  });

  it('3-4 total logs still resolve to the building comparison, never the >=5 average copy', () => {
    // logCount=4, periodCount=1 -> deriveDataState is still 'building'.
    expect(deriveDataState(1, 4)).toBe('building');
    const obs = buildPostLogObservation(deriveDataState(1, 4), 5, 5, null, null, { mood: 3, energy: 3 });
    expect(obs).toBe('امروز خلق و انرژی‌ات نسبت به ثبت قبلی‌ات بالاتر بود.');
    expect(obs).not.toContain('میانگین شخصی');
  });
});

describe('>=5 logs continues to use the existing average logic, unchanged', () => {
  it('ignores priorSameSignal entirely once dataState graduates past building', () => {
    expect(deriveDataState(2, 6)).toBe('multi_cycle');
    const withPrior = buildPostLogObservation('multi_cycle', 1, 1, 4, 8, { mood: 4.9, energy: 4.9 });
    const withoutPrior = buildPostLogObservation('multi_cycle', 1, 1, 4, 8, null);
    expect(withPrior).toBe(withoutPrior);
    expect(withPrior).toBe('امروز خلق و انرژی‌ات پایین‌تر از میانگین شخصی‌ات بود.');
  });
});

describe('existing empty-state behaviour is untouched', () => {
  it('still returns the original line regardless of priorSameSignal', () => {
    const obs = buildPostLogObservation('empty', 3, 3, null, null, { mood: 3, energy: 3 });
    expect(obs).toBe('ریتمو شروع می‌کنه به شناخت تو.');
  });
});
