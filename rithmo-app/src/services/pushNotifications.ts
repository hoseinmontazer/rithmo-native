import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { navigateToAdaptiveCheckIn, navigateToNotificationTarget } from '@navigation/navigationRef';
import { resolveNotificationTarget } from '../navigation/notificationTarget';

/**
 * Notification-tap routing.
 *
 * Every push `data` payload carries notification_id, notification_type,
 * related_id, related_type and (for partner features) an explicit `target`.
 * The destination is decided by the ONE shared resolver
 * (navigation/notificationTarget.ts), which the in-app NotificationsScreen
 * also uses, so a push tap and a list tap always land in the same place.
 * Unknown types resolve to null and are a no-op.
 *
 * No question, answer, or health data ever rides in the payload, and nothing
 * here is constructed from it: the destination screens fetch their own
 * server-authoritative data. A stale target (e.g. the partner link was since
 * removed) is handled by those screens' own empty states.
 */
// A single tap can reach this runtime through two paths (see the AppState
// listener in setupNotificationListeners), so routing is deduped by the
// FCM message id - one tap, one navigation, one analytics event.
let lastRoutedMessageId: string | null = null;

/** Fire-and-forget; analytics must never break (or block loading of) routing. */
function trackPushOpened(notificationType: string): void {
  try {
    // Required lazily so this module's routing stays loadable without the
    // analytics/network stack (and so a failure there cannot affect a tap).
    const { track } = require('@analytics');
    track('notification_opened', { notification_type: notificationType, source: 'push' });
  } catch {
    // ignore
  }
}

function routeNotificationTap(remoteMessage: FirebaseMessagingTypes.RemoteMessage | null | undefined): void {
  if (!remoteMessage) {
    return;
  }
  const messageId = remoteMessage.messageId ?? null;
  if (messageId !== null && messageId === lastRoutedMessageId) {
    return;
  }
  const data = remoteMessage.data ?? {};
  const type = typeof data.notification_type === 'string' ? data.notification_type : undefined;
  const target = resolveNotificationTarget({
    notification_type: type,
    related_type: typeof data.related_type === 'string' ? data.related_type : undefined,
    target: typeof data.target === 'string' ? data.target : undefined,
  });
  if (!type && !target) {
    return;
  }
  lastRoutedMessageId = messageId;
  if (type) {
    trackPushOpened(type);
  }
  try {
    if (target === 'adaptive_checkin') {
      navigateToAdaptiveCheckIn();
    } else if (target) {
      navigateToNotificationTarget(target);
    }
  } catch {
    // A failed navigation must never crash a notification tap.
  }
}

export async function requestUserPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      console.log('Notification permission denied');
      return false;
    }
  }

  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Authorization status:', authStatus);
    return true;
  }
  return false;
}

export async function getFCMToken() {
  try {
    const token = await messaging().getToken();
    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

export function setupNotificationListeners() {
  // Listen to foreground notifications
  const unsubscribe = messaging().onMessage(async remoteMessage => {
    console.log('A new FCM message arrived in the foreground!', JSON.stringify(remoteMessage));
  });

  // Listen to background notifications when the app is opened from them —
  // this IS a real user tap (unlike onMessage above, which just means a
  // notification arrived while the app was already open), so this is the
  // right place to route.
  const unsubscribeOpened = messaging().onNotificationOpenedApp(remoteMessage => {
    console.log(
      'Notification caused app to open from background state:',
      remoteMessage.notification,
    );
    routeNotificationTap(remoteMessage);
  });

  // E2 (warm tap) fallback. On Android with the new architecture, every
  // background push starts a headless JS task, and RN 0.75's
  // HeadlessJsTaskService always boots it on a second, legacy React
  // instance. RNFB's singleton event emitter then re-attaches to that
  // headless runtime, so the onNotificationOpenedApp event above for a
  // warm tap is delivered there instead of to this (UI) runtime. RNFB's
  // native onNewIntent — which runs on this runtime's own module instance
  // — stores the tapped message as its initial notification before
  // emitting, so reading getInitialNotification() whenever the app comes
  // back to the foreground recovers the tap. When the event does arrive
  // normally, the message-id dedupe in routeNotificationTap keeps it to a
  // single navigation.
  const appStateSubscription = AppState.addEventListener('change', state => {
    if (state !== 'active') {
      return;
    }
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          routeNotificationTap(remoteMessage);
        }
      })
      .catch(() => {});
  });

  // Check whether an initial notification is available (app opened from
  // quit state via a tap) — also a real tap, routed the same way.
  // navigateToAdaptiveCheckIn() itself queues the intent if
  // NavigationContainer isn't mounted yet (see navigationRef.ts) — this
  // promise can resolve before the app has finished its first render.
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log(
          'Notification caused app to open from quit state:',
          remoteMessage.notification,
        );
        routeNotificationTap(remoteMessage);
      }
    });

  return () => {
    unsubscribe();
    unsubscribeOpened();
    appStateSubscription.remove();
  };
}
