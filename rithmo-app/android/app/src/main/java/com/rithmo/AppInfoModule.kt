package com.rithmo

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Exposes build-time-only app info to JS — currently just which payment
 * provider this APK was assembled for.
 *
 * PAYMENT_PROVIDER / DISTRIBUTION come from BuildConfig, which in turn come
 * from the Gradle product flavor this APK was built with (`bazaar` or
 * `global` — see android/app/build.gradle's productFlavors). They are
 * compiled into the binary and cannot change without rebuilding; this is
 * deliberately NOT derived from anything observable at runtime (installer
 * package, store presence, etc. — see InstallSourceModule.kt, which stays
 * diagnostic-only).
 *
 * @services/installationSource.ts's getPaymentProvider() is the one place
 * in JS that reads this. Both a constants map and an explicit async method
 * are exposed for the same value — the async method mirrors the pattern
 * already proven to work in this app (InstallSourceModule) and is the
 * primary path, since getConstants() merging behavior is more sensitive to
 * old-arch/new-arch differences.
 */
class AppInfoModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AppInfoModule"

  override fun getConstants(): Map<String, Any> = mapOf(
      "PAYMENT_PROVIDER" to BuildConfig.PAYMENT_PROVIDER,
      "DISTRIBUTION" to BuildConfig.DISTRIBUTION,
  )

  @ReactMethod
  fun getPaymentProvider(promise: Promise) {
    promise.resolve(BuildConfig.PAYMENT_PROVIDER)
  }
}
