/**
 * analytics — the public surface. Import from `@analytics`, never from
 * `./client` directly, so every call site goes through the typed `track()`.
 */

import { useCallback } from 'react';
import {
  addAnalyticsListener,
  captureEvent,
  flush,
  getCurrentScreen,
  isAnalyticsEnabled,
  setAnalyticsEnabled,
  setCurrentScreen,
} from './client';
import type { EventName, EventProps, EventPropValue } from './types';

export type { AnalyticsEvent, EventName, EventProps } from './types';
export {
  addAnalyticsListener,
  flush as flushAnalytics,
  getCurrentScreen,
  isAnalyticsEnabled,
  setAnalyticsEnabled,
  setCurrentScreen,
};

/**
 * Record a product event.
 *
 * Typed per event so the compiler rejects properties the server would strip
 * anyway. Returns void and never throws — calling it from a render path or
 * a button handler is safe.
 */
export function track<N extends EventName>(
  name: N,
  props?: EventProps[N],
): void {
  captureEvent(name, (props ?? {}) as Record<string, EventPropValue>);
}

/** Hook form, for components that want a stable callback identity. */
export function useAnalytics() {
  const trackEvent = useCallback(
    <N extends EventName>(name: N, props?: EventProps[N]) => track(name, props),
    [],
  );
  return { track: trackEvent };
}
