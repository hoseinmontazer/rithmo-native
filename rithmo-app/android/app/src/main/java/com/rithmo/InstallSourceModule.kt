package com.rithmo

import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * RithmoInstallSource — the first custom native module in this project.
 *
 * Payment-routing only: this tells the JS side which app installed this
 * APK, so the paywall can choose Cafe Bazaar billing vs. the Zibal web
 * flow. It is NEVER an entitlement signal — nothing here grants or
 * implies Premium; that stays exactly where it already is, in the backend
 * Subscription model.
 *
 * The existing `isBazaarInstall()` (src/utils/store.ts, via
 * react-native-device-info's `getInstallerPackageName()`) is left
 * completely untouched — it already works for the live Bazaar/Poolakey
 * path and nothing here replaces or races with it. This module exists
 * because that call wraps the API deprecated since Android 30
 * (`PackageManager.getInstallerPackageName()`); the modern replacement,
 * `getInstallSourceInfo()`, distinguishes who initiated an install from
 * who is recorded as its installer of record, which react-native-device-info
 * collapses into one string. Below API 30, there is no such distinction to
 * make, so the legacy call is still the correct one there.
 */
private const val CAFEBAZAAR_PACKAGE_NAME = "com.farsitel.bazaar"

class InstallSourceModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "RithmoInstallSource"

  @ReactMethod
  fun getInstallationSource(promise: Promise) {
    try {
      val pm = reactApplicationContext.packageManager
      val packageName = reactApplicationContext.packageName

      val installer: String? =
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // API 30+: getInstallSourceInfo() is the documented replacement
            // for getInstallerPackageName(). installingPackageName is the
            // package recorded as this app's installer of record; on some
            // sideload paths Android leaves that null but still populates
            // initiatingPackageName (who started the install session), so
            // fall back to it rather than treating that case as unknown.
            val info = pm.getInstallSourceInfo(packageName)
            info.installingPackageName ?: info.initiatingPackageName
          } else {
            @Suppress("DEPRECATION")
            pm.getInstallerPackageName(packageName)
          }

      // null/absent is its own case, deliberately NOT folded into
      // "sideload": it means Android has no installer identity to report
      // at all (e.g. a bare `adb install` with no -i flag), which is a
      // different, less certain situation than "a real, non-Bazaar
      // installer performed this install" (e.g. the system package
      // installer after downloading an APK from a website). Only the
      // latter is confidently "sideload". The former stays "unknown" so
      // it never gets silently routed to a payment provider at all.
      val source = when {
        installer == CAFEBAZAAR_PACKAGE_NAME -> "bazaar"
        installer == null -> "unknown"
        else -> "sideload"
      }
      promise.resolve(source)
    } catch (e: Exception) {
      // Fail closed — a lookup failure must never be interpreted as
      // Bazaar (or anything else that would route to a payment flow the
      // user didn't actually arrive through).
      promise.resolve("unknown")
    }
  }
}
