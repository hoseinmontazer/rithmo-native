import { lightColors, darkColors, type AppColors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, buildShadows, motion, screen } from './spacing';

export function buildTheme(isDark: boolean) {
  const colors = isDark ? darkColors : lightColors;
  // Elevation is derived from the palette rather than hard-coded, so a shadow
  // is tinted by the theme it sits in and is emitted strongly enough to be
  // visible on a dark surface. `elevation` remains an alias of `shadow`, as
  // call sites use both names.
  const shadow = buildShadows(colors.shadow, isDark);
  return {
    colors,
    typography,
    spacing,
    // The page-edge frame, so screens read it from `useTheme()` alongside
    // spacing rather than importing the scale separately.
    screen,
    borderRadius,
    shadow,
    elevation: shadow,
    motion,
    isDark,
  } as const;
}

export type AppTheme = ReturnType<typeof buildTheme>;
export { lightColors, darkColors, typography, spacing, screen, borderRadius, buildShadows, motion };
export type { AppColors };

