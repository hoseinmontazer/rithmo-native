import { useMemo } from 'react';
import { useThemeStore } from '@store/themeStore';
import { buildTheme } from '@theme/index';

export function useTheme() {
  const isDark = useThemeStore((s) => s.isDark);
  // Memoised so downstream components only re-render when isDark flips
  return useMemo(() => buildTheme(isDark), [isDark]);
}
