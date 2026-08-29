/**
 * usePushTokenRegistration
 *
 * Registers the device's FCM push token with the Rithmo backend whenever:
 *   - The user is authenticated and the app mounts (app-start)
 *   - The FCM token refreshes (token rotation)
 *
 * Prerequisites (one-time native setup):
 *   1. Add @react-native-firebase/app and @react-native-firebase/messaging
 *      to the project:
 *        cd rithmo-app && npm install @react-native-firebase/app @react-native-firebase/messaging
 *   2. Download google-services.json (Android) from Firebase Console and
 *      place at android/app/google-services.json
 *   3. Download GoogleService-Info.plist (iOS) and place at ios/rithmo-app/
 *   4. Follow the @react-native-firebase/app setup guide for your RN version:
 *      https://rnfirebase.io/
 *
 * Until the native Firebase libraries are installed this hook is a no-op:
 * it catches the "module not found" error and logs a dev warning, so the
 * rest of the app continues working in a non-push environment (simulators,
 * CI, pre-Firebase-setup development).
 *
 * Usage:
 *   Called once inside MainNavigator (authenticated root):
 *     usePushTokenRegistration();
 *
 * Wired up in MainNavigator.tsx. `notifications/push_service.py` already
 * uses FCM's current HTTP v1 API via firebase-admin, gated by
 * FIREBASE_CREDENTIALS_PATH/FCM_ENABLED — see that module's own docstring.
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRegisterPushToken } from '@hooks/queries/useNotifications';
import { useAuth } from '@hooks/useAuth';

/** Attempt to load @react-native-firebase/messaging lazily.
 *  Returns null if the package is missing OR if the native module is not
 *  wired up (i.e. the JS package exists but calling messaging() would throw). */
function getMessaging(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-firebase/messaging').default;
    // Verify the native module is actually available by calling the factory.
    // If the native side isn't set up, this throws "No Firebase App '[DEFAULT]'"
    // or a NativeModule error — catch it and return null so we stay a no-op.
    mod();
    return mod;
  } catch {
    return null;
  }
}

export function usePushTokenRegistration(): void {
  const { isAuthenticated } = useAuth();
  const { mutateAsync: registerToken } = useRegisterPushToken();
  const registeredToken = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { return; }

    const messaging = getMessaging();
    if (!messaging) {
      if (__DEV__) {
        console.warn(
          '[usePushTokenRegistration] @react-native-firebase/messaging is not ' +
          'available (package missing or native module not configured). ' +
          'Push notifications are disabled. See usePushTokenRegistration.ts for setup.',
        );
      }
      return;
    }

    let unsubscribeRefresh: (() => void) | null = null;

    async function requestAndRegister(): Promise<void> {
      try {
        // Request permission (iOS only — Android ≥ 13 handled separately below)
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          if (__DEV__) {
            console.log('[usePushTokenRegistration] Push permission denied by user.');
          }
          return;
        }

        // Get the current FCM token
        const token: string = await messaging().getToken();
        if (!token || token === registeredToken.current) { return; }

        await registerToken({
          token,
          device_type: Platform.OS === 'ios' ? 'ios' : 'android',
        });

        registeredToken.current = token;

        if (__DEV__) {
          console.log('[usePushTokenRegistration] FCM token registered:', token.slice(0, 20) + '…');
        }
      } catch (err) {
        if (__DEV__) {
          console.warn('[usePushTokenRegistration] Failed to register FCM token:', err);
        }
      }
    }

    try {
      requestAndRegister();

      // Re-register whenever FCM rotates the token
      unsubscribeRefresh = messaging().onTokenRefresh(async (newToken: string) => {
        if (newToken === registeredToken.current) { return; }
        try {
          await registerToken({
            token: newToken,
            device_type: Platform.OS === 'ios' ? 'ios' : 'android',
          });
          registeredToken.current = newToken;
        } catch (err) {
          if (__DEV__) {
            console.warn('[usePushTokenRegistration] Token refresh registration failed:', err);
          }
        }
      });
    } catch (err) {
      if (__DEV__) {
        console.warn('[usePushTokenRegistration] Firebase setup error:', err);
      }
    }

    return () => {
      unsubscribeRefresh?.();
    };
  }, [isAuthenticated, registerToken]);
}
