import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { navigateToAdaptiveCheckIn } from '@navigation/navigationRef';

/**
 * Today 2.1 Phase E — notification-type -> screen routing.
 *
 * `data.notification_type` is already sent by the backend for every
 * notification (see notifications/push_service.py::send_notification_push
 * — no payload change was needed for this phase). Only `wellness_reminder`
 * routes anywhere; every other type is left exactly as before (a no-op,
 * same as prior to this phase) — this is deliberately narrow, not a
 * general-purpose notification router, since Phase E's scope is Today
 * 2.1 integration only.
 *
 * The mobile client never inspects anything beyond this one type string
 * to decide where to navigate — no question, answer, or health data ever
 * rides in the notification payload (see the backend's own payload,
 * unchanged by this phase), and no question is ever constructed here;
 * navigateToAdaptiveCheckIn() opens the exact same server-authoritative
 * screen the manual entry point uses, which re-fetches
 * GET /api/intelligence/checkin-session/today/ itself.
 */
// A single tap can reach this runtime through two paths (see the AppState
// listener in setupNotificationListeners), so routing is deduped by the
// FCM message id — one tap, one navigation.
let lastRoutedMessageId: string | null = null;

function routeNotificationTap(remoteMessage: FirebaseMessagingTypes.RemoteMessage | null | undefined): void {
  if (!remoteMessage) {
    return;
  }
  const messageId = remoteMessage.messageId ?? null;
  if (messageId !== null && messageId === lastRoutedMessageId) {
    return;
  }
  const type = remoteMessage.data?.notification_type;
  if (type === 'wellness_reminder') {
    lastRoutedMessageId = messageId;
    navigateToAdaptiveCheckIn();
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
