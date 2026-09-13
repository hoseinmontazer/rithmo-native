/**
 * Payment-provider selection — and, separately, installation-source
 * diagnostics.
 *
 * Rithmo ships through two Android channels — Cafe Bazaar (which requires
 * its own in-app billing) and direct website/sideload APKs (which use
 * Zibal). Which one a given build uses is decided at BUILD TIME, by the
 * Gradle product flavor it was assembled with (`bazaar` or `global` — see
 * android/app/build.gradle's productFlavors), compiled into
 * BuildConfig.PAYMENT_PROVIDER and exposed to JS by the native
 * AppInfoModule (android/app/src/main/java/com/rithmo/AppInfoModule.kt).
 * getPaymentProvider() below reads that — it is the one function the rest
 * of the app calls to decide Bazaar vs Zibal.
 *
 * This is NEVER an entitlement signal either way. Whether a user is
 * Premium is decided exclusively by the backend Subscription model;
 * nothing here grants, implies, or caches anything about entitlement.
 *
 * getInstallationSource() (and mapInstallationSourceToPaymentProvider,
 * normalizeInstallationSource) remain in this file but are now
 * DIAGNOSTIC-ONLY — a runtime check of which app installed this APK,
 * useful for telemetry and for catching a mismatched build (e.g. a bazaar
 * flavor build installed via a channel other than Bazaar), never an
 * authority for which payment UI to show. Branching payment logic on
 * installer identity is fragile and spoofable (ADB install, a review
 * sideload, OS versions that null out installer attribution) — see
 * docs/integrations/distribution-variants/MULTI_DISTRIBUTION_BUILD_SPEC.md
 * for the full rationale. @utils/store's isBazaarInstall() predates this
 * split and is unused by any live call site now; left untouched.
 *
 * The native RithmoInstallSource module backing getInstallationSource()
 * uses the modern getInstallSourceInfo() on API 30+ (see
 * android/app/src/main/java/com/rithmo/InstallSourceModule.kt), falling
 * back to the deprecated getInstallerPackageName() below it.
 */
import { NativeModules, Platform } from 'react-native';

export type InstallationSource = 'bazaar' | 'sideload' | 'unknown';
export type PaymentProvider = 'bazaar' | 'zibal' | 'unknown';
export type BuildPaymentProvider = 'bazaar' | 'zibal';

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
 * DIAGNOSTIC-ONLY mapping from "who installed this app" to "which payment
 * provider that would imply". Nothing calls this to decide what to show
 * (see getPaymentProvider() below, which is build-flavor-authoritative) —
 * it exists so getBuildPaymentProvider() can log a warning if the two ever
 * disagree (e.g. a bazaar-flavor build installed outside Bazaar).
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

export function normalizeBuildPaymentProvider(value: unknown): BuildPaymentProvider {
  // Compile-time constant, always one of exactly two values per flavor —
  // unlike the runtime installer check above, there's no legitimate
  // "unknown" here. Anything unexpected (native module missing, a flavor
  // whose buildConfigField was mistyped) fails closed to 'zibal', never
  // silently to 'bazaar': showing the Bazaar billing UI on a build that
  // isn't actually the Bazaar flavor is the one mistake Bazaar's own
  // review rules cannot tolerate.
  return value === 'bazaar' ? 'bazaar' : 'zibal';
}

let cachedBuildProvider: BuildPaymentProvider | null = null;

/**
 * The build-time source of truth: BuildConfig.PAYMENT_PROVIDER (set by the
 * Gradle product flavor this APK was assembled with), read through the
 * native AppInfoModule. This is what getPaymentProvider() below actually
 * returns on Android now — getInstallationSource() is consulted only to
 * log a diagnostic warning on mismatch, never to decide.
 */
export async function getBuildPaymentProvider(): Promise<BuildPaymentProvider> {
  if (Platform.OS !== 'android') {
    return 'zibal';
  }
  if (cachedBuildProvider !== null) {
    return cachedBuildProvider;
  }
  try {
    const native = NativeModules.AppInfoModule;
    let value: unknown = native?.getConstants?.().PAYMENT_PROVIDER;
    if (value == null && native?.getPaymentProvider) {
      value = await native.getPaymentProvider();
    }
    cachedBuildProvider = normalizeBuildPaymentProvider(value);
  } catch {
    cachedBuildProvider = 'zibal';
  }

  // Diagnostic only, fire-and-forget — never gates or delays the returned
  // provider above.
  const resolved = cachedBuildProvider;
  console.log(`[Rithmo] PAYMENT_PROVIDER=${resolved}`);
  getInstallationSource()
    .then((source) => {
      const implied = mapInstallationSourceToPaymentProvider(source);
      if (implied !== 'unknown' && implied !== resolved) {
        console.warn(
          `[Rithmo] installer-implied provider (${implied}) does not match the build-flavor provider (${resolved}) — the build flavor is authoritative.`,
        );
      }
    })
    .catch(() => {});

  return cachedBuildProvider;
}

export async function getPaymentProvider(): Promise<PaymentProvider> {
  if (Platform.OS !== 'android') {
    return 'unknown';
  }
  return getBuildPaymentProvider();
}
