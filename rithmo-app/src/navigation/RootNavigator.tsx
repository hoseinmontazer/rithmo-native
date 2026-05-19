import React, { Suspense } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '@store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { useTheme } from '@hooks/useTheme';

function SplashFallback() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing  = useAuthStore((s) => s.isInitializing);
  const { colors, isDark } = useTheme();

  if (isInitializing) return <SplashFallback />;

  return (
    <NavigationContainer
      theme={{
        dark: isDark,
        colors: {
          primary:    colors.primary,
          background: colors.background,
          card:       colors.surface,
          text:       colors.textPrimary,
          border:     colors.border,
          notification: colors.primary,
        },
      }}
    >
      <Suspense fallback={<SplashFallback />}>
        {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
      </Suspense>
    </NavigationContainer>
  );
}
