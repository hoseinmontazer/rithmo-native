/**
 * Rhythmo Design System — Colors
 *
 * Brand: green, in the family the product owner supplied as a Figma Make
 * reference (its `--primary` was `#16a34a`, Tailwind's green-600).
 *
 * ── Why the neutrals are neutral ─────────────────────────────────────────
 *
 * The neutrals used to be deliberately green-biased, so that they "belonged
 * to the palette instead of sitting against it". On device that backfired:
 * with the canvas, every surface, every border AND the text all carrying the
 * brand hue, a screen had no hue contrast anywhere and the whole app read as
 * one flat wash of green. The brand colour cannot register as an accent when
 * the background is a paler version of it.
 *
 * So the neutral ramp is now genuinely hue-free and the green is spent only
 * where it means something — brand, primary action, success. Measured as HLS
 * saturation, light-mode `textPrimary` went 0.429 -> 0.106 and `border`
 * 0.288 -> 0.115.
 *
 * This *raised* light-mode contrast rather than costing any: `textPrimary` on
 * canvas 15.44 -> 16.60, `textSecondary` 5.61 -> 6.33, `textTertiary`
 * 4.55 -> 4.96. Brand pairs are untouched at 6.81:1.
 *
 * Tokens that are brand tints rather than neutrals — `primaryLight`,
 * `primaryLighter`, `successBg` — keep their green on purpose; they are the
 * accent, not the ground.
 *
 * The reference's own primary is NOT used verbatim: measured, `#16a34a`
 * carries white text at only 3.30:1, so its primary button, its brand-coloured
 * text and its solid green sidebar all fail WCAG AA. The hue is kept and the
 * lightness lowered until white clears AA on it (6.81:1 here).
 *
 * ── Why success IS the brand green ───────────────────────────────────────
 *
 * With the brand on this hue there is no green left that both reads as
 * "success" and stays perceptually distinct from it. That was established by
 * search, not assumed: across hues 60-140 and every lightness that still
 * carries AA text on its own tint, nothing cleared ΔE 25 from the brand except
 * a dark olive (#6E6E0C), which reads as a warning rather than as success.
 *
 * Two greens that are ALMOST the same look like a mistake; two that are
 * identical look deliberate. So `success` is the brand green, by decision.
 * The signal is carried by the check glyph and the Persian label beside it —
 * which the product already requires, since colour is never allowed to be the
 * sole carrier of meaning (`design-system/iconography.ts`).
 *
 * Everything else stays far apart: the brand is ΔE 76 from warning, 103 from
 * error, 100 from accent and 54 from the nearest cycle phase.
 *
 * ── Contrast ─────────────────────────────────────────────────────────────
 *
 * Every foreground/background pair was re-measured for this palette rather
 * than inherited. Against the rose palette that preceded it, 6 pairs failed
 * WCAG AA in light and 1 in dark; this palette fails 1 and 0. The five that
 * are newly fixed are the semantic text-on-tint pairs — `Badge` renders
 * `colors.success` as TEXT on `colors.successBg`, and in rose that pairing
 * was 2.97:1. The one remaining light-mode miss is `border` on `surface`
 * (1.32:1), an intentionally hairline divider that carries no state; it was
 * 1.25:1 under the green-tinted neutrals.
 *
 * The phase colors (menstrual/follicular/ovulation/luteal) are the
 * DATA-VISUALIZATION language — they stay stable across the redesign, and
 * were deliberately NOT touched when the brand moved to green. The brand sits
 * ΔE 38 from `follicular`, the nearest of them, so it does not read as a
 * fifth phase.
 *
 * Premium moments use the gold `premium` tokens (paywall, premium cards).
 */

const lightColors = {
  // ── Neutrals (true neutral) ─────────────────────────────────────────────────────
  ink:             '#15171A',
  canvas:          '#F5F6F7',
  canvasDark:      '#101215',
  surface:         '#FFFFFF',
  surfaceSecondary:'#EFF1F3',
  surfaceSubtle:   '#E8EAED',
  border:          '#DDE0E4',
  borderSubtle:    '#EDEFF2',
  background:      '#F5F6F7',

  // ── Brand (deep pine-emerald) ───────────────────────────────────────────
  primary:         '#0E6930',
  primaryDark:     '#0B4F24',
  primaryLight:    '#D7F4E2',
  primaryLighter:  '#EEF9F2',
  primaryPressed:  '#0B4F24',
  textOnPrimary:   '#FFFFFF',

  // ── Text ────────────────────────────────────────────────────────────────
  textPrimary:     '#15171A',
  textSecondary:   '#565B61',
  // Re-measured on the neutral ramp: 4.96:1 on canvas and 5.37:1 on surface,
  // both AA, while staying clearly subordinate to textSecondary (6.33:1) so
  // the primary > secondary > tertiary hierarchy still holds.
  textTertiary:    '#666B72',
  textDisabled:    '#B4B8BE',

  // ── Accent (violet — data/secondary accent) ─────────────────────────────
  accent:          '#7C5CB8',
  accentLight:     '#EFE9F8',

  // ── Semantic ────────────────────────────────────────────────────────────
  success:         '#0E6930',
  successBg:       '#D7F4E2',
  successDark:     '#0B4F24',
  warning:         '#B05426',
  warningBg:       '#FBF0E1',
  error:           '#CE2929',
  errorBg:         '#FBE9E9',
  info:            '#3E6EAF',
  infoBg:          '#E8F0FA',
  infoDark:        '#2C5488',

  shadow:          '#5A5F66',

  // ── Cycle phase palette (data language — stable) ────────────────────────
  menstrual:       '#E11D48',
  menstrualBg:     '#FDECEF',
  menstrualBorder: '#F5B8C4',
  follicular:      '#2E9BB5',
  follicularBg:    '#E6F5F8',
  follicularBorder:'#A8DCE6',
  ovulation:       '#9A6BD0',
  ovulationBg:     '#F3ECFA',
  ovulationBorder: '#D4BEEC',
  luteal:          '#E8A23D',
  lutealBg:        '#FBF3E2',
  lutealBorder:    '#F0D3A0',

  // ── Premium (gold) ──────────────────────────────────────────────────────
  premium:         '#90662E',
  premiumBg:       '#F8F1E2',
  premiumBorder:   '#E7D5AE',

  // ── Restored legacy tokens (used by auth/support/AI/streak screens) ─────
  divider:         '#E9EBEE',
  ovulationColor:  '#9A6BD0',
  shadowColor:     '#6E737A',
  surfaceDark:     '#232629',
  textOnDark:      '#F4F5F6',
  violet500:       '#8B5CF6',
  violet600:       '#7C3AED',
};

const darkColors = {
  // ── Neutrals (neutral ink) ───────────────────────────────────────────────
  ink:             '#E6E8EA',
  canvas:          '#0F1113',
  canvasDark:      '#08090A',
  surface:         '#181A1D',
  surfaceSecondary:'#212428',
  surfaceSubtle:   '#282C30',
  border:          '#343940',
  borderSubtle:    '#282C30',
  background:      '#0F1113',

  // ── Brand (soft mint — the light-on-dark counterpart) ───────────────────
  primary:         '#6AD792',
  primaryDark:     '#4DCB7B',
  primaryLight:    '#1D3526',
  primaryLighter:  '#17291D',
  primaryPressed:  '#4DCB7B',
  textOnPrimary:   '#081F10',

  // ── Text ────────────────────────────────────────────────────────────────
  textPrimary:     '#E6E8EA',
  textSecondary:   '#A8ADB3',
  // Re-measured on the neutral ramp: 5.57:1 on dark surface, below
  // textSecondary's 7.72:1, so the hierarchy holds.
  textTertiary:    '#8D9299',
  textDisabled:    '#565B61',

  // ── Accent ──────────────────────────────────────────────────────────────
  accent:          '#B09ADB',
  accentLight:     '#2C2438',

  // ── Semantic ────────────────────────────────────────────────────────────
  success:         '#6AD792',
  successBg:       '#1D3526',
  successDark:     '#92DDAE',
  warning:         '#E8A23D',
  warningBg:       '#332A18',
  error:           '#E57373',
  errorBg:         '#3A2222',
  info:            '#7FA8DC',
  infoBg:          '#1F2A3A',
  infoDark:        '#9CBCE8',

  shadow:          '#000000',

  // ── Cycle phase palette (data language — stable) ────────────────────────
  menstrual:       '#F06284',
  menstrualBg:     '#3A2228',
  menstrualBorder: '#6E3442',
  follicular:      '#5BC4DB',
  follicularBg:    '#1C3238',
  follicularBorder:'#33565F',
  ovulation:       '#B893E3',
  ovulationBg:     '#2D2440',
  ovulationBorder: '#4D3A66',
  luteal:          '#EDB563',
  lutealBg:        '#3A3020',
  lutealBorder:    '#6B5430',

  // ── Premium (gold) ──────────────────────────────────────────────────────
  premium:         '#D9B25C',
  premiumBg:       '#332A18',
  premiumBorder:   '#57431E',

  // ── Restored legacy tokens ──────────────────────────────────────────────
  divider:         '#282C30',
  ovulationColor:  '#B893E3',
  shadowColor:     '#000000',
  surfaceDark:     '#1F2225',
  textOnDark:      '#F2F3F4',
  violet500:       '#A78BFA',
  violet600:       '#8B5CF6',
};

export type AppColors = typeof lightColors | typeof darkColors;

// NOTE: `borderRadius` and `shadows` used to be declared here as well as in
// `theme/spacing.ts`. Nothing imported this copy — `theme/index.ts` builds the
// theme from `spacing.ts` — so it was a second, silent definition of the same
// scales, and the two had already drifted: the dead shadow presets carried
// opacities of 0.06–0.14 against the live 0.03–0.06. Radius and elevation now
// have exactly one home, in `spacing.ts`.
export { lightColors, darkColors };
