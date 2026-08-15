/**
 * Rithmo — Production React Native App
 * Root component: wires up QueryClient, safe-area, and navigation.
 */
import React, { useEffect } from 'react';
import { StatusBar, useColorScheme, Appearance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from '@navigation/RootNavigator';
import { useAuthStore } from '@store/authStore';
import { useThemeStore } from '@store/themeStore';
import { QUERY_STALE_TIME_MS, QUERY_CACHE_TIME_MS } from '@constants/config';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { ToastProvider } from './src/context/ToastContext';
import { ConfirmProvider } from './src/context/ConfirmContext';

// ── React Query client ────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME_MS,
      gcTime:    QUERY_CACHE_TIME_MS,
      retry: (failureCount, error: unknown) => {
        // Don't retry on 401/403/404
        const status = (error as { response?: { status: number } })?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const initialize  = useAuthStore((s) => s.initialize);
  const { isDark, mode, setMode } = useThemeStore();
  const systemScheme = useColorScheme();

  // Bootstrap: restore auth session from secure storage on mount
  useEffect(() => {
    initialize();
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
