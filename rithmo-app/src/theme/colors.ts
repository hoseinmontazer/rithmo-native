/**
 * Rhythmo Design System — Colors
 *
 * Brand: green, retuned toward the palette in the "Rhythmo App" Claude
 * Design mockup (primary `#2F5D50`, a muted pine-teal — hue ~163°, vs. the
 * prior primary's hue ~142°). The mockup's own literal hex values are used
 * directly wherever they measured AA-clean; the rest of the ramp (dark-mode
 * brand tokens, the one text tier the mockup's own value failed on) was
 * derived by rotating the OLD token's hue by the same ~21° delta and
 * re-measuring, never by eyeballing.
 *
 * ── Why the neutrals are warm now ────────────────────────────────────────
 *
 * The mockup's screen background (`#FAF7F3`) and card/chip tints
 * (`#F1EDE7`, `#F1EEEA`) are warm — a different axis from the green-tinted
 * neutrals this system deliberately moved away from previously (see the
 * dated history below): warmth is not brand hue. `ink`/`textPrimary` and
 * `textSecondary` are the mockup's own literal values; `textTertiary` is
 * the one exception — the mockup's own `#8A848F` measured 3.40:1 on the new
 * canvas (below AA), so it was darkened along the same hue/warmth until it
 * cleared 4.5:1 while staying clearly lighter than `textSecondary`.
 *
 * ── Why the neutrals were EVER hue-free (history) ────────────────────────
 *
 * The neutrals were once deliberately green-biased, so that they "belonged
 * to the palette instead of sitting against it". On device that backfired:
 * with the canvas, every surface, every border AND the text all carrying the
 * brand hue, a screen had no hue contrast anywhere and the whole app read as
 * one flat wash of green. That lesson still holds — it is why this retune
 * did not chase the brand hue into the neutrals, only warmth.
 *
 * ── Contrast (this retune) ───────────────────────────────────────────────
 *
 * Re-measured, not inherited: `textOnPrimary` on `primary` 7.49:1, `primary`
 * as text on `surface` 7.49:1, on `primaryLight` 5.81:1 — all comfortably
 * above the prior palette's 6.81:1. `textPrimary` on canvas 15.06:1,
 * `textSecondary` 6.65:1, `textTertiary` 4.76:1 (the retuned value). Dark
 * mode: `textOnPrimary` on `primary` 9.85:1, `primary` as text on canvas
 * 10.83:1, on `primaryLight` 7.51:1.
 *
 * ── Why success IS the brand green ───────────────────────────────────────
 *
 * With the brand on this hue there is no green left that both reads as
 * "success" and stays perceptually distinct from it. That was established by
 * search, not assumed: across hues 60-140 and every lightness that still
 * carries AA text on its own tint, nothing cleared ΔE 25 from the brand except
 * a dark olive (#6E6E0C), which reads as a warning rather than as success.
 * The new hue (~163°) does not change that conclusion — nothing in this
 * retune moved warning/error/accent/the phase palette, so their ΔE distance
 * from the brand only grew.
 *
 * Two greens that are ALMOST the same look like a mistake; two that are
 * identical look deliberate. So `success` is the brand green, by decision.
 * The signal is carried by the check glyph and the Persian label beside it —
 * which the product already requires, since colour is never allowed to be the
 * sole carrier of meaning (`design-system/iconography.ts`).
 *
 * The phase colors (menstrual/follicular/ovulation/luteal) are the
 * DATA-VISUALIZATION language — they stay stable across the redesign, and
 * were deliberately NOT touched by this retune either.
 *
 * Premium moments use the gold `premium` tokens (paywall, premium cards) —
 * also untouched.
 *
 * `theme/brand.ts`'s `getBrandGradient()` (the dark hero/gold gradients used
 * across Home, Cycle and the paywall) is a separate, hand-tuned token set,
 * not derived from these primitives, and is out of scope for this retune —
 * it is shared by screens this mockup does not redesign.
 */

const lightColors = {
  // ── Neutrals (warm, per the mockup) ─────────────────────────────────────
  ink:             '#241F2B',
  canvas:          '#FAF7F3',
  canvasDark:      '#101215',
  surface:         '#FFFFFF',
  surfaceSecondary:'#F1EDE7',
  surfaceSubtle:   '#EDE7DF',
  border:          '#EAE5E0',
  borderSubtle:    '#F1EEEA',
  background:      '#FAF7F3',

  // ── Brand (muted pine-teal) ──────────────────────────────────────────────
  primary:         '#2F5D50',
  primaryDark:     '#234A40',
  primaryLight:    '#D8E6DE',
  primaryLighter:  '#E6EFEA',
  primaryPressed:  '#234A40',
  textOnPrimary:   '#FFFFFF',

  // ── Text ────────────────────────────────────────────────────────────────
  textPrimary:     '#241F2B',
  textSecondary:   '#5C5661',
  // The mockup's own `#8A848F` measured 3.40:1 on the new canvas (below
  // AA); darkened along the same hue/warmth to 4.76:1 on canvas / 5.09:1 on
  // surface, while staying clearly subordinate to textSecondary (6.65:1)
  // so the primary > secondary > tertiary hierarchy still holds.
  textTertiary:    '#726C77',
  textDisabled:    '#B7B0A9',

  // ── Accent (violet — data/secondary accent) ─────────────────────────────
  accent:          '#7C5CB8',
  accentLight:     '#EFE9F8',

  // ── Semantic ────────────────────────────────────────────────────────────
  success:         '#2F5D50',
  successBg:       '#D8E6DE',
  successDark:     '#234A40',
  warning:         '#B05426',
  warningBg:       '#FBF0E1',
  error:           '#CE2929',
  errorBg:         '#FBE9E9',
  info:            '#3E6EAF',
  infoBg:          '#E8F0FA',
  infoDark:        '#2C5488',

  shadow:          '#5C554A',

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

  // ── Clay (warm error/predicted-state accent) ────────────────────────────
  // From the "Rhythmo App" mockup and the auth design spec — a gentler,
  // non-alarming tone for predicted-period calendar cells and auth-flow
  // errors ("wrong password"), deliberately not the harsh `error` red the
  // rest of the app uses for real failures. The spec's own text value
  // (#A8654B) measured 4.14:1 on its own tint (below AA); darkened to the
  // same hue until it cleared 4.85:1, the same "keep the hue, lower the
  // lightness" fix already applied to the brand green.
  clay:            '#9C5A41',
  clayBg:          '#FBF3EE',
  clayBorder:      '#E7C3B0',

  // ── Restored legacy tokens (used by auth/support/AI/streak screens) ─────
  divider:         '#EAE5E0',
  ovulationColor:  '#9A6BD0',
  shadowColor:     '#6B6459',
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

  // ── Brand (soft teal-mint — the light-on-dark counterpart) ──────────────
  // Derived by rotating each old dark-brand token's hue by the same ~21°
  // delta the light-mode primary underwent (#0E6930 -> #2F5D50), keeping
  // each token's own lightness/saturation rather than eyeballing new ones.
  primary:         '#6AD7B7',
  primaryDark:     '#4DCBA6',
  primaryLight:    '#1D352E',
  primaryLighter:  '#172923',
  primaryPressed:  '#4DCBA6',
  textOnPrimary:   '#081F18',

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
  success:         '#6AD7B7',
  successBg:       '#1D352E',
  successDark:     '#92DDC8',
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

  // ── Clay (warm error/predicted-state accent) ────────────────────────────
  clay:            '#D99B7A',
  clayBg:          '#3A2A20',
  clayBorder:      '#5A4232',

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
