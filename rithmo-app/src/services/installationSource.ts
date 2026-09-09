/**
 * Installation-source / payment-provider detection.
 *
 * Rithmo ships through two Android channels — Cafe Bazaar (which requires
 * its own in-app billing, see @utils/store's isBazaarInstall) and direct
 * website/sideload APKs (which will use Zibal). This module decides which
 * payment UI to show, based on which app actually installed this APK —
 * NEVER an entitlement signal. Whether a user is Premium is decided
 * exclusively by the backend Subscription model; nothing here grants,
 * implies, or caches anything about entitlement.
 *
 * This is deliberately a SEPARATE module from @utils/store's
 * isBazaarInstall(), not a replacement:
 *   - isBazaarInstall() already works in production for the Bazaar/Poolakey
 *     purchase path and is left untouched.
 *   - isBazaarInstall() wraps react-native-device-info's
 *     getInstallerPackageName(), which itself wraps the Android API
 *     deprecated since API 30. The native RithmoInstallSource module backing
 *     this file uses the modern getInstallSourceInfo() on API 30+ (see
 *     android/app/src/main/java/com/rithmo/InstallSourceModule.kt).
 *   - Unlike isBazaarInstall(), this file has NO __DEV__ override. Debug
 *     builds must be able to exercise the sideload → Zibal path too, so the
 *     real installer identity is reported as-is even in development.
 */
import { NativeModules, Platform } from 'react-native';

export type InstallationSource = 'bazaar' | 'sideload' | 'unknown';
export type PaymentProvider = 'bazaar' | 'zibal' | 'unknown';

/**
 * Validates whatever the native side (or, in principle, any other caller)
 * hands back. Exported so the defensive handling of a malformed/unexpected
 * value is unit-testable on its own, without touching NativeModules —
 * anything that is not exactly one of the three known strings becomes
 * 'unknown' rather than being trusted or crashing.
 */
export function normalizeInstallationSource(value: unknown): InstallationSource {
  return value === 'bazaar' || value === 'sideload' || value === 'unknown' ? value : 'unknown';
}

/**
 * The single, centralized mapping from "who installed this app" to "which
 * payment provider to show". Pure and synchronous on purpose — this is the
 * one place that decision is made; nothing else (UpgradeScreen included)
 * should re-derive it.
 */
export function mapInstallationSourceToPaymentProvider(source: InstallationSource): PaymentProvider {
  switch (source) {
    case 'bazaar':
      return 'bazaar';
    case 'sideload':
      return 'zibal';
    case 'unknown':
    default:
      return 'unknown';
  }
}

let cachedSource: InstallationSource | null = null;

export async function getInstallationSource(): Promise<InstallationSource> {
  if (Platform.OS !== 'android') {
    // iOS has neither Bazaar nor this Android-only detection question yet.
    return 'unknown';
  }
  if (cachedSource !== null) {
    return cachedSource;
  }
  try {
    const native = NativeModules.RithmoInstallSource;
    if (!native?.getInstallationSource) {
      cachedSource = 'unknown';
      return cachedSource;
    }
    const result = await native.getInstallationSource();
    cachedSource = normalizeInstallationSource(result);
  } catch {
    cachedSource = 'unknown';
  }
  return cachedSource;
}

export async function getPaymentProvider(): Promise<PaymentProvider> {
  const source = await getInstallationSource();
  return mapInstallationSourceToPaymentProvider(source);
}
