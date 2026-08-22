/**
 * Analytics contract.
 *
 * Two guarantees are load-bearing and both are tested here:
 *
 *   1. Analytics can never break the app. Every entry point returns void
 *      and swallows failures — including a network layer that throws
 *      synchronously.
 *   2. Events carry behaviour, not health data.
 */

jest.mock('@api/client', () => ({
  apiClient: { post: jest.fn(() => Promise.resolve({ data: {} })) },
}));

import { apiClient } from '@api/client';
import {
  addAnalyticsListener,
  flushAnalytics,
  setAnalyticsEnabled,
  setCurrentScreen,
  track,
} from '@analytics';
import { __resetAnalyticsForTests } from '@analytics/client';
import type { AnalyticsEvent } from '@analytics';

const post = apiClient.post as jest.Mock;

function capture(): AnalyticsEvent[] {
  const seen: AnalyticsEvent[] = [];
  addAnalyticsListener((e) => seen.push(e));
  return seen;
}

beforeEach(() => {
  __resetAnalyticsForTests();
  post.mockClear();
  post.mockImplementation(() => Promise.resolve({ data: {} }));
});

describe('event capture', () => {
  it('captures a screen visit with the active route', () => {
    const seen = capture();
    setCurrentScreen('Home');
    track('home_viewed', { learning_mode: false, action_count: 3 });

    expect(seen).toHaveLength(1);
    expect(seen[0].name).toBe('home_viewed');
    expect(seen[0].screen).toBe('Home');
    expect(seen[0].props).toEqual({ learning_mode: false, action_count: 3 });
  });

  it('captures the daily-log funnel', () => {
    const seen = capture();
    track('daily_log_opened', { is_edit: false });
    track('daily_log_submitted', { field_count: 4, had_symptoms: true });

    expect(seen.map((e) => e.name)).toEqual(['daily_log_opened', 'daily_log_submitted']);
  });

  it('stamps session, anonymous id, platform and version', () => {
    const seen = capture();
    track('app_opened', { cold_start: true });

    const e = seen[0];
    expect(e.session_id).toBeTruthy();
    expect(e.anonymous_id).toBeTruthy();
    expect(e.platform).toBe('android');
    expect(e.app_version).toBeTruthy();
    expect(typeof e.timestamp).toBe('string');
  });

  it('keeps one session id across events in the same run', () => {
    const seen = capture();
    track('app_opened', {});
    track('home_viewed', {});
    expect(seen[0].session_id).toBe(seen[1].session_id);
  });
});

describe('privacy — the client never composes a health payload', () => {
  it('sends only counts and booleans for a daily log', () => {
    const seen = capture();
    track('daily_log_submitted', { field_count: 5, had_symptoms: true });

    // Assert on the SHAPE, not on key substrings: `had_symptoms` legitimately
    // contains the word "symptom" while carrying no symptom — it answers
    // "did she record any", which is behaviour, not a measurement. The rule
    // that matters is that every value is a count or a boolean.
    const props = seen[0].props;
    expect(Object.keys(props).sort()).toEqual(['field_count', 'had_symptoms']);
    for (const value of Object.values(props)) {
      expect(['number', 'boolean']).toContain(typeof value);
    }
    // And specifically: no symptom code, no free text.
    expect(JSON.stringify(props)).not.toMatch(/cramps|headache|bloating|[\u0600-\u06FF]/);
  });

  it('insight events carry a rule key, not the user’s values', () => {
    const seen = capture();
    track('insight_viewed', {
      insight_key: 'phase:energy:luteal:down',
      insight_kind: 'phase',
      confidence: 'established',
    });

    // The key names which RULE fired. It contains no measurement.
    expect(seen[0].props.insight_key).toBe('phase:energy:luteal:down');
    expect(Object.keys(seen[0].props)).toEqual(
      expect.arrayContaining(['insight_key', 'insight_kind', 'confidence']),
    );
    expect(seen[0].props).not.toHaveProperty('recent_mean');
    expect(seen[0].props).not.toHaveProperty('baseline_centre');
  });
});

describe('analytics failure cannot break the app', () => {
  it('does not throw when delivery rejects', () => {
    post.mockImplementation(() => Promise.reject(new Error('network down')));
    expect(() => {
      for (let i = 0; i < 20; i += 1) { track('app_opened', {}); }
      flushAnalytics();
    }).not.toThrow();
  });

  it('does not throw when the transport throws synchronously', () => {
    post.mockImplementation(() => { throw new Error('boom'); });
    expect(() => {
      for (let i = 0; i < 20; i += 1) { track('home_viewed', {}); }
      flushAnalytics();
    }).not.toThrow();
  });

  it('does not throw when a listener throws', () => {
    addAnalyticsListener(() => { throw new Error('bad listener'); });
    expect(() => track('app_opened', {})).not.toThrow();
  });

  it('flushing an empty buffer is a no-op', () => {
    flushAnalytics();
    expect(post).not.toHaveBeenCalled();
  });
});

describe('kill switch', () => {
  it('captures nothing while disabled', () => {
    const seen = capture();
    setAnalyticsEnabled(false);
    track('home_viewed', {});
    track('daily_log_submitted', {});

    expect(seen).toHaveLength(0);
    flushAnalytics();
    expect(post).not.toHaveBeenCalled();
  });
});

describe('delivery', () => {
  it('batches to the ingest endpoint', () => {
    for (let i = 0; i < 12; i += 1) { track('app_opened', {}); }
    expect(post).toHaveBeenCalledWith('/api/analytics/events/', expect.objectContaining({
      events: expect.any(Array),
    }));
  });
});
