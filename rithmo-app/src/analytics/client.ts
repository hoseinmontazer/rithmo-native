/**
 * analytics/client.ts — buffered, non-blocking, fail-silent event capture.
 *
 * Three properties this module guarantees, in priority order:
 *
 *   1. **Analytics can never break the app.** Every public entry point is
 *      synchronous, returns void, and swallows its own errors. A network
 *      failure, a serialisation error, or an unavailable backend produces
 *      dropped events and nothing else. No `await` reaches a UI callback.
 *
 *   2. **It can be turned off completely.** `setAnalyticsEnabled(false)`
 *      stops capture and clears the buffer, so a future consent switch has
 *      somewhere to attach without touching call sites.
 *
 *   3. **It carries no health data.** Callers use the typed `track()` in
 *      index.ts; the server independently allowlists names and property
 *      keys. Both sides have to be wrong for a measurement to be stored.
 *
 * Delivery is a simple size/time-triggered batch. There is no retry queue
 * and no disk persistence: losing telemetry is acceptable, and a durable
 * outbox is a meaningful amount of machinery to maintain for data whose
 * only consumer today is a product question.
 */

import { Platform } from 'react-native';
import { apiClient } from '@api/client';
import type { AnalyticsEvent, EventName, EventPropValue } from './types';

const APP_VERSION = '1.0.5';

/** Flush when the buffer reaches this many events… */
const BATCH_SIZE = 12;
/** …or when this long has passed since the first buffered event. */
const FLUSH_INTERVAL_MS = 15_000;
/** Hard ceiling so a flush outage cannot grow memory without bound. */
const MAX_BUFFER = 100;
/** A new foreground period after this much inactivity is a new session. */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

type Listener = (event: AnalyticsEvent) => void;

let enabled = true;
let buffer: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let sessionId = '';
let sessionLastActivity = 0;
let anonymousId = '';
let currentScreen = '';
const listeners = new Set<Listener>();

// ── ids ──────────────────────────────────────────────────────────────────────

/**
 * Random-enough identifier. Not a device fingerprint and not derived from
 * anything about the person — it exists to stitch a session together and is
 * regenerated whenever the app decides to.
 */
function randomId(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  );
}

function ensureAnonymousId(): string {
  if (!anonymousId) { anonymousId = randomId(); }
  return anonymousId;
}

/**
 * Current session id, rolling over after inactivity.
 *
 * "Session" here is an app-foreground period, which is all that is needed
 * to answer "did she open Home and then finish a log". Nothing more
 * elaborate is warranted.
 */
function ensureSession(): string {
  const now = Date.now();
  if (!sessionId || now - sessionLastActivity > SESSION_TIMEOUT_MS) {
    sessionId = randomId();
  }
  sessionLastActivity = now;
  return sessionId;
}

// ── public control surface ───────────────────────────────────────────────────

export function setAnalyticsEnabled(next: boolean): void {
  enabled = next;
  if (!next) {
    buffer = [];
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  }
}

export function isAnalyticsEnabled(): boolean {
  return enabled;
}

/** Records the active route so events do not each have to pass it. */
export function setCurrentScreen(route: string): void {
  currentScreen = route;
}

export function getCurrentScreen(): string {
  return currentScreen;
}

/**
 * Dev/test observer. Used by the debug sink and by tests to assert what was
 * captured without hitting the network.
 */
export function addAnalyticsListener(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// ── capture ──────────────────────────────────────────────────────────────────

export function captureEvent(
  name: EventName,
  props: Record<string, EventPropValue> = {},
): void {
  if (!enabled) { return; }

  try {
    const event: AnalyticsEvent = {
      name,
      timestamp: new Date().toISOString(),
      session_id: ensureSession(),
      anonymous_id: ensureAnonymousId(),
      screen: currentScreen || undefined,
      app_version: APP_VERSION,
      platform: Platform.OS,
      props,
    };

    listeners.forEach((l) => {
      try { l(event); } catch { /* a listener must not break capture */ }
    });

    buffer.push(event);
    if (buffer.length > MAX_BUFFER) { buffer = buffer.slice(-MAX_BUFFER); }

    if (buffer.length >= BATCH_SIZE) {
      flush();
    } else if (!flushTimer) {
      flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS);
    }
  } catch {
    // Capture is best-effort by contract.
  }
}

/**
 * Send whatever is buffered. Safe to call at any time; never throws and
 * never returns a rejected promise to a caller.
 */
export function flush(): void {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  if (!enabled || buffer.length === 0) { return; }

  const batch = buffer;
  buffer = [];

  // Deliberately not awaited anywhere. Dropped on failure — telemetry must
  // never surface an error to the user or delay a screen.
  //
  // The try/catch is not redundant with .catch(): a transport that throws
  // SYNCHRONOUSLY (a misconfigured client, an interceptor that raises before
  // returning a promise) never produces a promise to reject, so .catch()
  // alone would let the exception escape into whatever UI callback happened
  // to trigger the flush. Both paths have to be covered for the "analytics
  // cannot break the app" guarantee to actually hold.
  try {
    const result = apiClient.post('/api/analytics/events/', { events: batch });
    if (result && typeof (result as Promise<unknown>).catch === 'function') {
      (result as Promise<unknown>).catch(() => { /* dropped by design */ });
    }
  } catch {
    /* dropped by design */
  }
}

/** Test/dev helper: clear all state between cases. */
export function __resetAnalyticsForTests(): void {
  buffer = [];
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  sessionId = '';
  sessionLastActivity = 0;
  anonymousId = '';
  currentScreen = '';
  enabled = true;
  listeners.clear();
}
