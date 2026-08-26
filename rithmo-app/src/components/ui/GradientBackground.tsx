/**
 * GradientBackground — the brand wash behind the auth hero.
 *
 * ── What was wrong ──────────────────────────────────────────────────────────
 *
 * This component carried its own four-colour palette — `rose`, `violet`,
 * `teal`, `amber` — hard-coded as Tailwind-ish literals with no connection to
 * the theme. Three consequences, in order of severity:
 *
 *  1. **It was theme-blind.** The wash was `#fff1f2` in every theme, so in
 *     dark mode it painted a near-white pink behind dark-mode content. The
 *     only screen using it is the login hero, which is why this was never
 *     noticed — but it is the first screen a user sees.
 *  2. **It was off-palette.** When the brand moved to green, the login hero
 *     stayed pink, because this colour lived outside `theme/colors.ts` and no
 *     palette change could reach it.
 *  3. **The name over-promised.** It rendered `colors[0]` as a flat
 *     `backgroundColor` and never used the second stop, so the "gradient" was
 *     a single flat fill.
 *
 * ── What it is now ──────────────────────────────────────────────────────────
 *
 * An actual gradient, drawn by `GradientSurface` — which exists precisely
 * because `react-native-svg`'s `LinearGradient` is a paint definition rather
 * than a view, and using it as a container silently drops its children.
 *
 * The ramp runs from the palest brand tint into the screen's own ground, so
 * the hero has depth at the top and dissolves into the card below it rather
 * than ending on a hard edge. It is deliberately quiet: this sits behind a
 * wordmark and a logo, and a loud gradient would compete with both.
 */
import React, { memo } from 'react';
import type { ViewStyle } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { GradientSurface } from './GradientSurface';

interface GradientBackgroundProps {
  children?: React.ReactNode;
  /**
   * Override the ramp outright. Prefer leaving this unset so the surface
   * follows the theme.
   */
  colors?: string[];
  style?: ViewStyle;
}

export const GradientBackground = memo(function GradientBackground({
  children,
  colors: colorsProp,
  style,
}: GradientBackgroundProps) {
  const { colors, isDark } = useTheme();

  // Light: the brand tint settling into white. Dark: a faintly brand-lifted
  // surface settling into the canvas — a tinted wash on a near-black screen
  // reads as a rendering fault rather than as brand colour, so the dark ramp
  // stays within a few percent of the ground.
  const ramp =
    colorsProp ??
    (isDark
      ? [colors.primaryLighter, colors.canvas]
      : [colors.primaryLight, colors.surface]);

  return (
    <GradientSurface colors={ramp} diagonal={false} style={style}>
      {children}
    </GradientSurface>
  );
});
