import { lightColors, darkColors, type AppColors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, shadow, elevation, motion } from './spacing';

export function buildTheme(isDark: boolean) {
  return {
    colors: isDark ? darkColors : lightColors,
    typography,
    spacing,
    borderRadius,
    shadow,
    elevation,
    motion,
    isDark,
  } as const;
}

export type AppTheme = ReturnType<typeof buildTheme>;
export { lightColors, darkColors, typography, spacing, borderRadius, shadow, elevation, motion };
export type { AppColors };

