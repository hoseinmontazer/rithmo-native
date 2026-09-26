/**
 * Today 2.1 Phase E — a root-level navigation ref.
 *
 * Needed for exactly one thing: routing a tapped push notification to a
 * screen from OUTSIDE the React tree (services/pushNotifications.ts's
 * listeners are plain FCM callbacks, not components, so they have no
 * `navigation` prop to call). This is the standard, minimal React
 * Navigation pattern for that — not a new notification framework, not a
 * parallel routing system; it is wired into the exact same
 * NavigationContainer every screen already navigates through (see
 * RootNavigator.tsx's `ref={navigationRef}`).
 *
 * Cold start is the hard case. When a notification tap launches a killed
 * app, `getInitialNotification()` resolves long before the target exists:
 * `LogTab` only appears after three separate gates have all opened —
 * auth initialisation (RootNavigator renders SplashFallback before the
 * container even mounts), the onboarding check (SplashFallback again,
 * inside the container), and role resolution (MainNavigator renders a
 * spinner until the role is known). The container's own `onReady` fires
 * at the second gate, when there is still no tab navigator — navigating
 * then only logs "The 'navigation' object hasn't been initialized yet"
 * (it does not throw), so the intent must stay queued until `LogTab` is
 * actually present in the root state, not merely until the container is.
 */
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/** Bounded tail for the gap between MainNavigator committing its tab
 * navigator and that navigator registering its state with the container. */
const MAX_TAIL_ATTEMPTS = 10;
const TAIL_RETRY_MS = 100;

let pendingAdaptiveCheckIn = false;
let tailAttempts = 0;
let tailTimer: ReturnType<typeof setTimeout> | null = null;

/** True only once the tab navigator that owns `LogTab` is mounted and
 * registered — never merely because the container exists. */
function isAdaptiveCheckInReachable(): boolean {
  if (!navigationRef.isReady()) {
    return false;
  }
  const root = navigationRef.getRootState();
  return !!root?.routeNames?.includes('LogTab');
}

function performNavigateToAdaptiveCheckIn(): void {
  try {
    navigationRef.navigate('LogTab' as never, { screen: 'AdaptiveCheckIn' } as never);
  } catch {
    // Never worth crashing the app over a notification tap — same
    // "never throws" convention as App.tsx's other fire-and-forget calls.
  }
}

/** Navigates now if possible; otherwise queues and flushes it once. */
function tryFlush(): boolean {
  if (!pendingAdaptiveCheckIn || !isAdaptiveCheckInReachable()) {
    return false;
  }
  pendingAdaptiveCheckIn = false;
  if (tailTimer) {
    clearTimeout(tailTimer);
    tailTimer = null;
  }
  performNavigateToAdaptiveCheckIn();
  return true;
}

/**
 * Navigate to Today 2.1's adaptive check-in — the ONE thing a
 * notification tap does, converging with the exact same route
 * `DailyCheckInCard`'s manual entry point already uses
 * (`LogTab` -> `AdaptiveCheckIn`). If the target isn't mounted yet (cold
 * start), the intent is queued and flushed by the two hooks below.
 */
export function navigateToAdaptiveCheckIn(): void {
  if (isAdaptiveCheckInReachable()) {
    performNavigateToAdaptiveCheckIn();
    return;
  }
  pendingAdaptiveCheckIn = true;
}

/** NavigationContainer's `onReady`. Only an opportunistic attempt — at
 * this point the tab navigator usually does not exist yet, so a queued
 * intent is kept (not dropped) for onMainNavigatorReady to flush. */
export function onNavigationContainerReady(): void {
  tryFlush();
}

/**
 * Called by MainNavigator once its role gate has opened and the tab
 * navigator is rendered — the earliest moment `LogTab` can exist. Retries
 * briefly (bounded) to cover the tick before the navigator registers its
 * state, then gives up and clears the intent: if `LogTab` still isn't
 * there, this account cannot reach the check-in at all (e.g. a partner
 * account, which has no LogTab), and the tap simply leaves them on Home.
 */
export function onMainNavigatorReady(): void {
  if (!pendingAdaptiveCheckIn) {
    return;
  }
  tailAttempts = 0;
  const attempt = () => {
    tailTimer = null;
    if (tryFlush() || !pendingAdaptiveCheckIn) {
      return;
    }
    tailAttempts += 1;
    if (tailAttempts >= MAX_TAIL_ATTEMPTS) {
      pendingAdaptiveCheckIn = false;
      return;
    }
    tailTimer = setTimeout(attempt, TAIL_RETRY_MS);
  };
  attempt();
}
