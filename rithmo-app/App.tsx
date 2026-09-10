/**
 * Rithmo — Production React Native App
 * Root component: wires up QueryClient, safe-area, and navigation.
 */
import React, { useEffect } from 'react';
import { StatusBar, Appearance, I18nManager } from 'react-native';
import { enableScreens, enableFreeze } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';

enableScreens(true);
enableFreeze(true);
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@api/queryClient';
import { RootNavigator } from '@navigation/RootNavigator';
import { useAuthStore } from '@store/authStore';
import { useThemeStore, hydrateThemeStore } from '@store/themeStore';
import { applyGlobalFont } from '@theme/applyGlobalFont';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { ToastProvider } from './src/context/ToastContext';
import { ConfirmProvider } from './src/context/ConfirmContext';
import { setupNotificationListeners } from './src/services/pushNotifications';

// ── Persian-first: full RTL layout (Android; iOS follows locale) ─────────────
I18nManager.forceRTL(true);

// ── Persian type family, applied before the first render (F-07) ──────────────
// The app shipped no fontFamily at all, so every glyph used the device's own
// fallback face. This installs Vazirmatn once, for every Text and TextInput,
// without touching any size or weight — and deliberately skips styles that
// already name a family, which is what keeps the icon set intact.
applyGlobalFont();

// ── Restore the persisted theme choice (audit M6) before first render ───────
hydrateThemeStore();

// ── React Query client ────────────────────────────────────────────────────────
// Lives in its own module so the auth store can clear it when the signed-in
// identity changes — see src/api/queryClient.ts.

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const initialize  = useAuthStore((s) => s.initialize);
  const { isDark, mode, setMode } = useThemeStore();

  // Bootstrap: restore auth session from secure storage on mount
  useEffect(() => {
    initialize();

    // Foreground/background/tap listeners only — safe to register before
    // login, and requesting no permission itself. The actual permission
    // request + token fetch/registration happens in
    // usePushTokenRegistration (gated on isAuthenticated, wired into
    // MainNavigator) — that used to be duplicated here too, requesting
    // permission unconditionally at every app launch before the user had
    // even logged in. On iOS the system permission dialog is effectively
    // a one-time prompt, so that premature request could burn the user's
    // one chance to grant it before they'd seen any login/context, and
    // the token it fetched was never sent anywhere (only console.log'd).
    const unsubscribe = setupNotificationListeners();

    return () => {
      unsubscribe();
    };
  }, [initialize]);

  // Keep system theme in sync when mode === 'system'
  useEffect(() => {
    if (mode !== 'system') return;
    const sub = Appearance.addChangeListener(() => {
      setMode('system'); // re-triggers isDark resolution
    });
    return () => sub.remove();
  }, [mode, setMode]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ToastProvider>
            <ConfirmProvider>
              <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor="transparent"
                translucent
              />
              <RootNavigator />
            </ConfirmProvider>
          </ToastProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
