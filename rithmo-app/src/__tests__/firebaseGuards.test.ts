/**
 * Missing Firebase configuration must disable push, not the app.
 *
 * Without google-services (a build that skips it, a missing config file),
 * @react-native-firebase's messaging() throws synchronously
 * ("No Firebase App '[DEFAULT]' has been created"). setupNotificationListeners
 * runs from App's mount effect, so an unguarded throw took the whole app down
 * on launch. When Firebase IS configured the behaviour is unchanged (covered
 * by pushNotificationsWarmTap.test.ts).
 */
export {};

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: () => {
    throw new Error("No Firebase App '[DEFAULT]' has been created - call firebase.initializeApp()");
  },
}));

jest.mock('react-native', () => ({
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
  PermissionsAndroid: {},
  Platform: { OS: 'android', Version: 34 },
}));

jest.mock('@navigation/navigationRef', () => ({
  navigateToAdaptiveCheckIn: jest.fn(),
  navigationRef: { isReady: () => false, navigate: jest.fn() },
}), { virtual: true });

import { setupNotificationListeners } from '../services/pushNotifications';

describe('setupNotificationListeners without Firebase', () => {
  it('does not throw and returns a callable no-op cleanup', () => {
    let cleanup: (() => void) | undefined;
    expect(() => {
      cleanup = setupNotificationListeners();
    }).not.toThrow();
    expect(typeof cleanup).toBe('function');
    expect(() => cleanup!()).not.toThrow();
  });
});
