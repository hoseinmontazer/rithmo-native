/**
 * themeStore — app theme mode with PERSISTENCE.
 *
 * Audit M6 (2026-08-20): theme choice was not persisted and reverted to
 * system on every restart. Now the mode is stored in AsyncStorage and
 * hydrated at app start (App.tsx calls hydrateThemeStore()).
 */
import { create } from 'zustand';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_MODE_KEY = 'rithmo_…e_mode';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'system') { return Appearance.getColorScheme() === 'dark'; }
  return mode === 'dark';
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  isDark: resolveIsDark('system'),

  setMode: (mode) => {
    set({ mode, isDark: resolveIsDark(mode) });
    AsyncStorage.setItem(THEME_MODE_KEY, mode).catch(() => {
      /* persistence is best-effort */
    });
  },
}));

/**
 * Restore the persisted theme mode at app start. Call once before render
 * (module level in App.tsx). Safe to call repeatedly.
 */
export function hydrateThemeStore(): void {
  AsyncStorage.getItem(THEME_MODE_KEY)
    .then((stored) => {
      if (isThemeMode(stored)) {
        useThemeStore.setState({ mode: stored, isDark: resolveIsDark(stored) });
      }
    })
    .catch(() => { /* stay on system default */ });
}
