/**
 * RootNavigator
 *
 * Render order:
 *   1. SplashFallback   — while auth is initializing
 *   2. AuthNavigator    — if not authenticated
 *   3. OnboardingScreen — if authenticated but onboarding not complete
 *   4. MainNavigator    — main app
 */
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { useTheme } from '@hooks/useTheme';
import { useProfile } from '@hooks/queries/useProfile';
import OnboardingScreen from '@screens/onboarding/OnboardingScreen';
import { flushAnalytics, setCurrentScreen, track } from '@analytics';
import { installAnalyticsDevSink } from '@analytics/devSink';

const ONBOARDING_KEY = 'onboarding_complete';

function SplashFallback() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ marginTop: 16, color: colors.textPrimary }}>در حال بارگذاری...</Text>
    </View>
  );
}

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing  = useAuthStore((s) => s.isInitializing);
  const initialize      = useAuthStore((s) => s.initialize);
  const { colors, isDark } = useTheme();

  // Track whether onboarding has been completed (null = not yet checked)
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  // Analytics: install the dev sink and record the launch once.
  useEffect(() => {
    installAnalyticsDevSink();
    track('app_opened', { cold_start: true });
    // Best-effort flush on unmount so a short session still reports.
    return () => { flushAnalytics(); };
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    initialize().catch((error) => {
      if (__DEV__) {
        console.error('Initialization error:', error);
      }
    });
  }, [initialize]);

  // Has this ACCOUNT completed onboarding — not just this install.
  //
  // This used to read AsyncStorage alone, so a reinstall or a new device
  // replayed onboarding for an account that had long since finished. That is
  // not merely annoying: onboarding PATCHes `user_role`, so replaying it on
  // a partner's account could overwrite their role with 'owner' and hand
  // them the owner application. The server value is authoritative; the local
  // flag remains as the fast path and as the offline fallback.
  const { data: profile, isSuccess: profileLoaded, isError: profileFailed } = useProfile();

  useEffect(() => {
    if (!isAuthenticated) {
      // Reset when user logs out so it re-checks on next login
      setOnboardingDone(null);
      return;
    }
    if (profile?.onboarding_completed) {
      setOnboardingDone(true);
      // Keep the local flag in step so the next launch skips the round-trip.
      AsyncStorage.setItem(ONBOARDING_KEY, '1').catch(() => { /* non-fatal */ });
      return;
    }
    // Decide only once the profile has DEFINITIVELY settled.
    //
    // Gating on `isLoading` is not enough: a react-query that is disabled or
    // already settled reports isLoading === false while holding no data, so
    // the AsyncStorage fallback ran before the server was ever consulted and
    // replayed onboarding for a completed account. `isSuccess || isError` is
    // the only state that actually means "the server has answered".
    if (!profileLoaded && !profileFailed) { return; }
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((val) => setOnboardingDone(val === '1'))
      .catch(() => setOnboardingDone(true)); // on storage error, skip onboarding
  }, [isAuthenticated, profile?.onboarding_completed, profileLoaded, profileFailed]);

  if (isInitializing) {
    return <SplashFallback />;
  }

  return (
    <NavigationContainer
      // One place records the active route, so no screen has to remember to
      // report itself and none of them can disagree about the route name.
      onStateChange={(state) => {
        try {
          let route: any = state?.routes?.[state.index ?? 0];
          while (route?.state) {
            const child = route.state;
            route = child.routes?.[child.index ?? 0];
          }
          if (route?.name) {
            setCurrentScreen(route.name);
            track('screen_viewed', { route: route.name });
          }
        } catch { /* navigation introspection must never break navigation */ }
      }}
      theme={{
        dark: isDark,
        colors: {
          primary:      colors.primary,
          background:   colors.background,
          card:         colors.surface,
          text:         colors.textPrimary,
          border:       colors.border,
          notification: colors.primary,
        },
      }}
    >
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : onboardingDone === null ? (
        // Still checking AsyncStorage — show splash rather than flickering
        <SplashFallback />
      ) : !onboardingDone ? (
        <OnboardingScreen onComplete={() => setOnboardingDone(true)} />
      ) : (
        <MainNavigator />
      )}
    </NavigationContainer>
  );
}
