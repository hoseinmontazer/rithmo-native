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
import OnboardingScreen from '@screens/onboarding/OnboardingScreen';

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

  // Initialize auth on mount
  useEffect(() => {
    initialize().catch((error) => {
      if (__DEV__) {
        console.error('Initialization error:', error);
      }
    });
  }, [initialize]);

  // Check onboarding flag when the user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // Reset when user logs out so it re-checks on next login
      setOnboardingDone(null);
      return;
    }
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((val) => setOnboardingDone(val === '1'))
      .catch(() => setOnboardingDone(true)); // on storage error, skip onboarding
  }, [isAuthenticated]);

  if (isInitializing) {
    return <SplashFallback />;
  }

  return (
    <NavigationContainer
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
