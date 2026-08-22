package com.rithmo

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.modules.i18nmanager.I18nUtil
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()

    // Persian-first: set the RTL flag natively, before React Native starts.
    //
    // App.tsx also calls I18nManager.forceRTL(true), but on Android that only
    // writes a SharedPreference — the layout direction for the current process
    // was already read from that preference before any JS ran. So on a freshly
    // installed app the preference is unset at process start and the entire
    // first session renders LTR: mirrored tab bar, input icons and chevrons on
    // the wrong side, through registration and onboarding. It corrects itself
    // only when the user next cold-starts the app.
    //
    // Writing it here, before SoLoader, means the preference is already true
    // when React Native reads it on this same launch. Verified on device by
    // comparing first launch after `pm clear` against the next launch.
    I18nUtil.instance.allowRTL(applicationContext, true)
    I18nUtil.instance.forceRTL(applicationContext, true)

    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      load()
    }
  }
}
