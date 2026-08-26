export const spacing = {
  0:   0,
  1:   4,
  2:   8,
  3:   12,
  4:   16,
  5:   20,
  6:   24,
  7:   28,
  8:   32,
  9:   36,
  10:  40,
  11:  44,
  12:  48,
  14:  56,
  16:  64,
  20:  80,
  24:  96,

  // Semantic spacing aliases
  none:  0,
  xs:    4,
  sm:    8,
  md:    12,
  base:  16,
  lg:    20,
  xl:    24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

/**
 * Corner radius.
 *
 * Softened to match the reference design supplied by the product owner, which
 * is built almost entirely on Tailwind's `rounded-xl` (12) and `rounded-2xl`
 * (16) with no radius below 8. Cards moved 14 -> 16, controls 10 -> 12 and
 * chips 6 -> 8; the larger steps were already in the right place.
 *
 * One name per value. There used to be sixteen keys for eight radii —
 * `sm`/`small`, `md`/`medium`/`control`, `lg`/`large`/`card`, `xl`/`xlarge`,
 * `pill`/`full` — so two components could use the same corner and look like
 * they had made different decisions, and a reader could not tell whether
 * `card` and `lg` were meant to move together. The duplicates were migrated to
 * the canonical key and removed; `borderRadiusScaleIsCanonical` in the design
 * system tests keeps them from growing back.
 */
/**
 * The screen frame — one set of page-edge insets for the whole product.
 *
 * Audited across 27 screens before this existed: the horizontal gutter was
 * spacing[4], [5] or [6] depending on the file, the top inset was one of
 * 64/32/28/16/12/8 or missing entirely on seven screens, and the bottom inset
 * had six different values. Each page looked fine alone; moving between them
 * read as sloppiness, because content sat at a different distance from the
 * edge on almost every one.
 *
 * `bottomTab` vs `bottom` is the one distinction that is real: a screen inside
 * the tab navigator has to clear the tab bar, a pushed screen does not.
 *
 * Auth and onboarding are deliberate exceptions — they are centred hero
 * layouts rather than content pages, and their larger top inset is doing
 * vertical composition, not page framing.
 */
export const screen = {
  /** Horizontal gutter. Every content page, no exceptions. */
  gutter:    16,
  /** Distance from the safe-area top to the first element. */
  top:       16,
  /** Bottom inset for a screen inside the tab navigator. */
  bottomTab: 80,
  /** Bottom inset for a pushed screen with no tab bar. */
  bottom:    48,
} as const;

export const borderRadius = {
  none:  0,
  xs:    4,
  sm:    8,     // Compact badges & micro chips
  md:    12,    // Standard controls, buttons & form inputs
  lg:    16,    // Standard cards & modules
  xl:    20,    // Bottom sheets & prominent containers
  '2xl': 24,
  '3xl': 32,
  pill:  9999,  // Status pills & avatars
} as const;

/**
 * Elevation.
 *
 * ── What was wrong ──────────────────────────────────────────────────────────
 *
 * There were nine presets for what is really a five-step ladder: `brand`,
 * `soft` and `subtle` were all a ~0.04–0.06 shadow at elevation 2, i.e. three
 * names for `sm`. Nine names invite a tenth, and none of them expressed a
 * different height.
 *
 * More seriously, every preset hard-coded `shadowColor: '#111827'` — a
 * blue-grey. Two things follow from that. It is off-palette (the theme has
 * always carried its own `shadow` colour token, and nothing used it), and it
 * is theme-blind: the same faint 4%-opacity blue-grey was emitted on a white
 * canvas and on a near-black one, where it is simply invisible. Dark surfaces
 * need a darker, more opaque shadow to read at all.
 *
 * ── What this is ────────────────────────────────────────────────────────────
 *
 * One ladder, built from the active palette. `buildShadows` is called by
 * `buildTheme`, so `useTheme().shadow` keeps working unchanged at every call
 * site — the values simply follow the theme now.
 *
 * `brand`, `soft` and `subtle` are retained as aliases of `sm` so existing
 * call sites keep compiling, and are marked deprecated so they do not spread.
 */

export interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

/** height (dp), blur, light-theme opacity — the ladder, in one place. */
const LADDER = {
  xs: { h: 1, blur: 2,  opacity: 0.05, elevation: 1 },
  sm: { h: 2, blur: 5,  opacity: 0.07, elevation: 2 },
  md: { h: 4, blur: 10, opacity: 0.09, elevation: 4 },
  lg: { h: 8, blur: 20, opacity: 0.12, elevation: 8 },
} as const;

/**
 * Dark surfaces swallow a light shadow, so the same step is emitted stronger.
 * The multiplier is applied to opacity only; height and blur define the step
 * and must stay identical, or an element would appear to change height with
 * the theme.
 */
const DARK_OPACITY_MULTIPLIER = 3.2;

export function buildShadows(shadowColor: string, isDark: boolean) {
  const step = (k: keyof typeof LADDER): ShadowStyle => {
    const { h, blur, opacity, elevation } = LADDER[k];
    return {
      shadowColor,
      shadowOffset: { width: 0, height: h },
      shadowOpacity: Math.min(1, opacity * (isDark ? DARK_OPACITY_MULTIPLIER : 1)),
      shadowRadius: blur,
      elevation,
    };
  };

  const none: ShadowStyle = {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  };

  const sm = step('sm');

  return {
    none,
    xs: step('xs'),
    sm,
    md: step('md'),
    lg: step('lg'),
    /** A sheet lifting from the bottom edge — the one shadow that casts up. */
    modal: {
      ...step('lg'),
      shadowOffset: { width: 0, height: -4 },
    } as ShadowStyle,
    /** @deprecated alias of `sm` — was a third name for the same shadow. */
    brand: sm,
    /** @deprecated alias of `sm`. */
    soft: sm,
    /** @deprecated alias of `sm`. */
    subtle: sm,
  } as const;
}

export type AppShadows = ReturnType<typeof buildShadows>;

export const motion = {
  fast:   150, // Micro button tap responses
  normal: 220, // Tab transitions, sheet slide-ins
  slow:   350, // Cycle gauge mount animation
} as const;

