/**
 * Partner Today content states (Partner 2.0 P1).
 *
 * The server decides `data_state` / `freshness`; the client only maps them.
 * The distinctions that matter, each pinned here:
 *   - low data is not an error, not disconnected
 *   - first use is not an error, not disconnected
 *   - stale is not an error
 *   - a payload from a server older than P1 is plain usable content
 */
import {
  resolvePartnerTodayContent,
  wellbeingFreshnessLine,
  sharedCategoryLabels,
  secondaryThemes,
  FIRST_USE_COPY,
  LOW_DATA_COPY,
} from '../screens/home/partnerTodayContent';
import { resolvePartnerHomeState } from '../screens/home/partnerHomeState';

declare const __dirname: string;

const sharing = (over: Partial<Record<'period_status' | 'upcoming_period' | 'wellbeing' | 'mood', boolean>> = {}) => ({
  period_status: true, upcoming_period: true, wellbeing: false, mood: false, ...over,
});

describe('resolvePartnerTodayContent', () => {
  it('usable: ready data with current or no wellbeing information', () => {
    expect(resolvePartnerTodayContent({ data_state: 'ready', sharing: sharing({ wellbeing: true }), freshness: { wellbeing: 'today' } })).toBe('usable');
    expect(resolvePartnerTodayContent({ data_state: 'ready', sharing: sharing({ wellbeing: true }), freshness: { wellbeing: 'recent' } })).toBe('usable');
    expect(resolvePartnerTodayContent({ data_state: 'ready', sharing: sharing(), freshness: { wellbeing: null } })).toBe('usable');
  });

  it('stale: ready data whose shared wellbeing information has gone quiet', () => {
    expect(resolvePartnerTodayContent({ data_state: 'ready', sharing: sharing({ wellbeing: true }), freshness: { wellbeing: 'stale' } })).toBe('stale');
  });

  it('stale is never claimed about wellbeing the owner does not share', () => {
    expect(resolvePartnerTodayContent({ data_state: 'ready', sharing: sharing({ wellbeing: false }), freshness: { wellbeing: 'stale' } })).toBe('usable');
  });

  it('low_data: something recorded, nothing usable', () => {
    expect(resolvePartnerTodayContent({ data_state: 'low_data', sharing: sharing(), freshness: { wellbeing: null } })).toBe('low_data');
  });

  it('first_use: nothing recorded yet', () => {
    expect(resolvePartnerTodayContent({ data_state: 'no_data', sharing: sharing(), freshness: { wellbeing: null } })).toBe('first_use');
  });

  it('a server older than P1 (no data_state) is plain usable content, never guessed empty or stale', () => {
    expect(resolvePartnerTodayContent({ sharing: sharing() } as any)).toBe('usable');
    expect(resolvePartnerTodayContent({ sharing: sharing({ wellbeing: true }) } as any)).toBe('usable');
  });
});

describe('state distinctions (fetch state vs content state)', () => {
  const ok = { status: 'success' };

  it('error is not disconnected', () => {
    expect(resolvePartnerHomeState({ data: undefined, isLoading: false, isError: true })).toBe('error');
  });

  it('low data, first use and stale all arrive through a SUCCESSFUL fetch (connected), never error', () => {
    expect(resolvePartnerHomeState({ data: ok, isLoading: false, isError: false })).toBe('connected');
    for (const data_state of ['low_data', 'no_data', 'ready'] as const) {
      expect(['usable', 'stale', 'low_data', 'first_use']).toContain(
        resolvePartnerTodayContent({ data_state, sharing: sharing({ wellbeing: true }), freshness: { wellbeing: 'stale' } }),
      );
    }
  });

  it('loading is its own state', () => {
    expect(resolvePartnerHomeState({ data: undefined, isLoading: true, isError: false })).toBe('loading');
  });
});

describe('copy helpers', () => {
  it('wellbeing freshness line: only for shared wellbeing, one calm line per bucket', () => {
    expect(wellbeingFreshnessLine({ wellbeing: 'today' }, false)).toBeNull();
    expect(wellbeingFreshnessLine({ wellbeing: null }, true)).toBeNull();
    expect(wellbeingFreshnessLine(undefined, true)).toBeNull();
    const lines = (['today', 'recent', 'stale', 'none'] as const).map((b) => wellbeingFreshnessLine({ wellbeing: b }, true));
    expect(lines.every((l) => typeof l === 'string' && l.length > 0)).toBe(true);
    expect(new Set(lines).size).toBe(4);
  });

  it('"today" wording is used only for the today bucket', () => {
    expect(wellbeingFreshnessLine({ wellbeing: 'recent' }, true)).not.toMatch(/امروز/);
    expect(wellbeingFreshnessLine({ wellbeing: 'stale' }, true)).not.toMatch(/امروز/);
  });

  it('shared categories use the owner toggle wording and only list what IS shared', () => {
    expect(sharedCategoryLabels(sharing())).toEqual(['مرحله‌ی چرخه', 'دوره‌ی پیش‌رو']);
    expect(sharedCategoryLabels(sharing({ period_status: false, upcoming_period: false }))).toEqual([]);
    expect(sharedCategoryLabels(sharing({ wellbeing: true, mood: true }))).toContain('خلق‌وخو');
    expect(sharedCategoryLabels(sharing({ wellbeing: false, mood: true }))).not.toContain('خلق‌وخو');
    expect(sharedCategoryLabels(undefined)).toEqual([]);
  });

  it('secondary themes skip the primary and the neutral ones', () => {
    expect(secondaryThemes(['on_period', 'low_energy', 'pain'])).toEqual(['low_energy', 'pain']);
    expect(secondaryThemes(['unknown'])).toEqual([]);
    expect(secondaryThemes(['low_mood', 'steady'])).toEqual([]);
  });

  it('first-use and low-data copy is Persian, calm, and makes no health or alarm claim', () => {
    for (const copy of [FIRST_USE_COPY, LOW_DATA_COPY]) {
      expect(copy.title).toMatch(/[؀-ۿ]/);
      expect(copy.body).toMatch(/[؀-ۿ]/);
      expect(`${copy.title}${copy.body}`).not.toMatch(/[A-Za-z]/);
      expect(`${copy.title}${copy.body}`).not.toMatch(/خطا|مشکل|بیمار|پزشک|باردار/);
    }
    expect(FIRST_USE_COPY.title).not.toEqual(LOW_DATA_COPY.title);
  });

  it('no emoji in the Partner Today copy', () => {
    const all = JSON.stringify([FIRST_USE_COPY, LOW_DATA_COPY, wellbeingFreshnessLine({ wellbeing: 'stale' }, true)]);
    expect(all).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});

describe('PartnerHomeScreen wiring (source contract)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path');
  const src: string = fs.readFileSync(path.join(__dirname, '..', 'screens', 'home', 'PartnerHomeScreen.tsx'), 'utf8');

  it('maps the server state through the resolver and keeps the P0 error state', () => {
    expect(src).toMatch(/resolvePartnerTodayContent\(/);
    expect(src).toMatch(/resolvePartnerHomeState\(/);
    expect(src).toMatch(/<ErrorState/);
  });

  it('first-use / low-data states keep the support actions and are not the error component', () => {
    const lowBranch = src.slice(src.indexOf("contentState === 'first_use'"), src.indexOf("contentState === 'first_use'") + 900);
    expect(lowBranch).toMatch(/<SupportActionRow/);
    expect(lowBranch).not.toMatch(/<ErrorState/);
  });

  it('does not add an endpoint or a second data hook for P1', () => {
    expect((src.match(/usePartnerToday\(/g) ?? []).length).toBe(1);
  });

  it('never renders owner_name (it can fall back to a username)', () => {
    expect(src).not.toMatch(/owner_name/);
  });

  it('emits one state event per transition and no health content', () => {
    expect(src).toMatch(/track\('partner_today_state', \{ state: analyticsState \}\)/);
  });
});
