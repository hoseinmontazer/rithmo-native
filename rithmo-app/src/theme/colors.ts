/**
 * Rhythmo Design System — Colors
 *
 * Brand: calm feminine health palette. The primary brand color is a deep
 * rose (not black, not default-Material blue). Light mode uses a warm
 * off-white canvas — never plain white screens.
 *
 * The phase colors (menstrual/follicular/ovulation/luteal) are the
 * DATA-VISUALIZATION language — they stay stable across the redesign.
 *
 * Premium moments use the gold `premium` tokens (paywall, premium cards).
 */

const lightColors = {
  // ── Neutrals (warm) ─────────────────────────────────────────────────────
  ink:             '#241B20',
  canvas:          '#FAF7F9',
  canvasDark:      '#141114',
  surface:         '#FFFFFF',
  surfaceSecondary:'#F7F1F4',
  surfaceSubtle:   '#F3EBEF',
  border:          '#EFE4EA',
  borderSubtle:    '#F5EEF2',
  background:      '#FAF7F9',

  // ── Brand (deep rose) ───────────────────────────────────────────────────
  primary:         '#A64368',
  primaryDark:     '#873452',
  primaryLight:    '#F6E4EC',
  primaryLighter:  '#FBF1F5',
  primaryPressed:  '#873452',
  textOnPrimary:   '#FFFFFF',

  // ── Text ────────────────────────────────────────────────────────────────
  textPrimary:     '#241B20',
  textSecondary:   '#6E5E68',
  // Raised from #9A8A93 (3.27:1 on surface, 3.07:1 on background) which
  // failed WCAG AA for normal text. #7C6B77 gives 4.97:1 / 4.67:1 while
  // staying clearly subordinate to textSecondary (6.06:1), so the hierarchy
  // primary > secondary > tertiary is preserved rather than flattened.
  textTertiary:    '#7C6B77',
  textDisabled:    '#C4B6BE',

  // ── Accent (violet — data/secondary accent) ─────────────────────────────
  accent:          '#7C5CB8',
  accentLight:     '#EFE9F8',

  // ── Semantic ────────────────────────────────────────────────────────────
  success:         '#2E9E6B',
  successBg:       '#E4F4EC',
  successDark:     '#1F7A4F',
  warning:         '#D9822B',
  warningBg:       '#FBF0E1',
  error:           '#D64545',
  errorBg:         '#FBE9E9',
  info:            '#3E6FB0',
  infoBg:          '#E8F0FA',
  infoDark:        '#2C5488',

  shadow:          '#8A7280',

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
  premium:         '#A67C2E',
  premiumBg:       '#F8F1E2',
  premiumBorder:   '#E7D5AE',

  // ── Restored legacy tokens (used by auth/support/AI/streak screens) ─────
  divider:         '#F0E8EC',
  ovulationColor:  '#9A6BD0',
  shadowColor:     '#8A7280',
  surfaceDark:     '#332530',
  textOnDark:      '#F7F2F5',
  violet500:       '#8B5CF6',
  violet600:       '#7C3AED',
};

const darkColors = {
  // ── Neutrals (warmed ink) ───────────────────────────────────────────────
  ink:             '#EDE6EA',
  canvas:          '#141114',
  canvasDark:      '#0B090B',
  surface:         '#1D181C',
  surfaceSecondary:'#262025',
  surfaceSubtle:   '#2C252B',
  border:          '#372F36',
  borderSubtle:    '#2E272D',
  background:      '#141114',

  // ── Brand (soft rose) ───────────────────────────────────────────────────
  primary:         '#E5A3BE',
  primaryDark:     '#D98FB3',
  primaryLight:    '#3A2530',
  primaryLighter:  '#302029',
  primaryPressed:  '#D98FB3',
  textOnPrimary:   '#2E1B26',

  // ── Text ────────────────────────────────────────────────────────────────
  textPrimary:     '#EDE6EA',
  textSecondary:   '#B3A6AF',
  // Was #857A83 (4.26:1 on dark surface) — also short of AA. #9A8E97 gives
  // 5.58:1, below textSecondary's 7.49:1.
  textTertiary:    '#9A8E97',
  textDisabled:    '#5C535A',

  // ── Accent ──────────────────────────────────────────────────────────────
  accent:          '#B09ADB',
  accentLight:     '#2C2438',

  // ── Semantic ────────────────────────────────────────────────────────────
  success:         '#5BC98F',
  successBg:       '#1C3229',
  successDark:     '#7FDCAE',
  warning:         '#E8A23D',
  warningBg:       '#3A2E1C',
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
  divider:         '#2E272D',
  ovulationColor:  '#B893E3',
  shadowColor:     '#000000',
  surfaceDark:     '#241C23',
  textOnDark:      '#F2ECF0',
  violet500:       '#A78BFA',
  violet600:       '#8B5CF6',
};

export type AppColors = typeof lightColors | typeof darkColors;

const borderRadius = {
  none:  0,
  xs:    4,
  sm:    6,
  md:    10,
  lg:    14,
  xl:    20,
  '2xl': 24,
  '3xl': 32,
  pill:  9999,
  card:  14,
  control: 10,
  // Aliases kept for legacy components
  full:   9999,
  small:  6,
  medium: 10,
  large:  14,
  xlarge: 20,
};

const shadows = {
  none: {},
  xs:   { shadowColor: '#000', shadowOffset: { width: 0, height: 1 },  shadowOpacity: 0.06, shadowRadius: 2,  elevation: 1 },
  sm:   { shadowColor: '#000', shadowOffset: { width: 0, height: 2 },  shadowOpacity: 0.08, shadowRadius: 6,  elevation: 2 },
  md:   { shadowColor: '#000', shadowOffset: { width: 0, height: 6 },  shadowOpacity: 0.10, shadowRadius: 12, elevation: 4 },
  lg:   { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 8 },
};

export { lightColors, darkColors, borderRadius, shadows };
