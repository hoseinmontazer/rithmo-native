/**
 * Store detection — decides which payment provider to show.
 *
 * Cafe Bazaar's publishing rules forbid apps distributed through Bazaar
 * from selling subscriptions or digital content through any channel other
 * than Bazaar's own in-app billing (no Stripe checkout link, no external
 * payment page). That rule only binds the Bazaar-installed copy of the
 * app — a copy installed directly (APK) or, later, on iOS keeps using
 * Stripe. `isBazaarInstall` tells the paywall which one it's running as,
 * by reading which app "installed" this one (the package manager records
 * this at install time; sideloading or `adb install` leaves it null).
 */
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { CAFEBAZAAR_PACKAGE_NAME } from '@constants/config';

let cachedIsBazaarInstall: boolean | null = null;

// TEMPORARY for the Cafe Bazaar end-to-end purchase test — this build is
// installed via `adb install`, so the real installer-package check below
// would (correctly) say "not Bazaar" and we'd never exercise the Poolakey
// path. Poolakey only needs the Bazaar app present on the phone to open
// its billing UI; it doesn't care who installed *our* apk. Remove this
// early return after testing.
const FORCE_BAZAAR_FOR_SIDELOADED_TEST_BUILD = __DEV__;

export async function isBazaarInstall(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  if (FORCE_BAZAAR_FOR_SIDELOADED_TEST_BUILD) {
    return true;
  }
  if (cachedIsBazaarInstall !== null) {
    return cachedIsBazaarInstall;
  }
  try {
    const installer = await DeviceInfo.getInstallerPackageName();
    cachedIsBazaarInstall = installer === CAFEBAZAAR_PACKAGE_NAME;
  } catch {
    // Can't determine the installer (e.g. emulator quirks) — fall back to
    // Stripe rather than risk showing a Bazaar purchase flow to a user
    // who doesn't have the Bazaar app installed.
    cachedIsBazaarInstall = false;
  }
  return cachedIsBazaarInstall;
}
