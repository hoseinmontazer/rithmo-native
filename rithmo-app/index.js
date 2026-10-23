/**
 * React Native entry point.
 * @format
 */
import { AppRegistry, LogBox } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';

// Register background handler. Guarded: when Firebase is not configured (a
// build without google-services, a missing config file) messaging() throws
// synchronously, and an unguarded throw here stops the app from registering at
// all instead of just disabling push.
try {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Message handled in the background!', remoteMessage);
  });
} catch (e) {
  if (__DEV__) {
    console.log('[index] Firebase messaging unavailable; push disabled.', e);
  }
}
import { name as appName } from './app.json';

// Disable console logs in production
if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.info = () => {};
  console.debug = () => {};
}

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
]);

// Global error handler
const errorHandler = (error, isFatal) => {
  if (__DEV__) {
    console.error('Global error:', error, 'isFatal:', isFatal);
  }
  // In production, you might want to send to error tracking service
};

// Set global error handler
if (ErrorUtils) {
  ErrorUtils.setGlobalHandler(errorHandler);
}

AppRegistry.registerComponent(appName, () => App);
