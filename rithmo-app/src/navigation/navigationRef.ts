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
import type { NotificationTarget } from './notificationTarget';

export const navigationRef = createNavigationContainerRef();

/** Bounded tail for the gap between MainNavigator committing its tab
 * navigator and that navigator registering its state with the container. */
const MAX_TAIL_ATTEMPTS = 10;
const TAIL_RETRY_MS = 100;

/** Where each target lives: the tab that must exist, and how to reach it. */
const TARGET_ROUTES: Record<NotificationTarget, { tab: string; params?: Record<string, unknown> }> = {
  // Owner-only tab: a partner account has no LogTab, so this gives up.
  adaptive_checkin: { tab: 'LogTab', params: { screen: 'AdaptiveCheckIn' } },
  // Available to both roles (ProfileStack > PartnerMessages > MessagesStack).
  messages: {
    tab: 'ProfileTab',
    params: { screen: 'PartnerMessages', params: { screen: 'MessagesList' } },
  },
  // Same route name for both roles (HomeStack picks PartnerHome vs Home by
  // role), so an owner simply lands on their own Home.
  partner_home: { tab: 'HomeTab', params: { screen: 'Home' } },
};

let pendingTarget: NotificationTarget | null = null;
let tailAttempts = 0;
let tailTimer: ReturnType<typeof setTimeout> | null = null;

/** True only once the tab navigator that owns the target's tab is mounted
 * and registered - never merely because the container exists. */
function isTargetReachable(target: NotificationTarget): boolean {
  if (!navigationRef.isReady()) {
    return false;
  }
  const root = navigationRef.getRootState();
  return !!root?.routeNames?.includes(TARGET_ROUTES[target].tab);
}

function performNavigate(target: NotificationTarget): void {
  try {
    const { tab, params } = TARGET_ROUTES[target];
    navigationRef.navigate(tab as never, params as never);
  } catch {
    // Never worth crashing the app over a notification tap - same
    // "never throws" convention as App.tsx's other fire-and-forget calls.
  }
}

/** Navigates now if possible; otherwise leaves it queued. */
function tryFlush(): boolean {
  const target = pendingTarget;
  if (!target || !isTargetReachable(target)) {
    return false;
  }
  pendingTarget = null;
  if (tailTimer) {
    clearTimeout(tailTimer);
    tailTimer = null;
  }
  performNavigate(target);
  return true;
}

/**
 * Navigate to a notification's destination. If the target isn't mounted yet
 * (cold start), the intent is queued (latest wins) and flushed by the two
 * hooks below.
 */
export function navigateToNotificationTarget(target: NotificationTarget | null): void {
  if (!target) {
    return;
  }
  if (isTargetReachable(target)) {
    performNavigate(target);
    return;
  }
  pendingTarget = target;
}

/**
 * Today 2.1's adaptive check-in - converges with the exact same route
 * `DailyCheckInCard`'s manual entry point already uses
 * (`LogTab` -> `AdaptiveCheckIn`).
 */
export function navigateToAdaptiveCheckIn(): void {
  navigateToNotificationTarget('adaptive_checkin');
}

/** NavigationContainer's `onReady`. Only an opportunistic attempt - at
 * this point the tab navigator usually does not exist yet, so a queued
 * intent is kept (not dropped) for onMainNavigatorReady to flush. */
export function onNavigationContainerReady(): void {
  tryFlush();
}

/**
 * Called by MainNavigator once its role gate has opened and the tab
 * navigator is rendered - the earliest moment the target tab can exist.
 * Retries briefly (bounded) to cover the tick before the navigator registers
 * its state, then gives up and clears the intent: if the tab still isn't
 * there, this account cannot reach the target at all (e.g. a partner
 * account has no LogTab), and the tap simply leaves them on Home.
 */
export function onMainNavigatorReady(): void {
  if (!pendingTarget) {
    return;
  }
  tailAttempts = 0;
  const attempt = () => {
    tailTimer = null;
    if (tryFlush() || !pendingTarget) {
      return;
    }
    tailAttempts += 1;
    if (tailAttempts >= MAX_TAIL_ATTEMPTS) {
      pendingTarget = null;
      return;
    }
    tailTimer = setTimeout(attempt, TAIL_RETRY_MS);
  };
  attempt();
}
