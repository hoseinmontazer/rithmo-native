export const palette = {
  // ── ColorHunt Palette: #EEEEEE #6FCF97 #2FA084 #1F6F5F ──────────────────
  // Primary teal/green shades
  teal50:   '#f0fdf9',
  teal100:  '#d1fae5',
  teal200:  '#a7f3d0',
  teal300:  '#6FCF97',  // ColorHunt light green
  teal400:  '#2FA084',  // ColorHunt medium teal
  teal500:  '#1F6F5F',  // ColorHunt dark teal
  teal600:  '#1a5d50',
  teal700:  '#154b41',

  // Neutrals
  grey50:   '#fffefd',
  grey100:  '#faf9f6',
  grey200:  '#F6F5F1',
  grey300:  '#E7E3DA',
  grey400:  '#C9C2B7',
  grey500:  '#756F68',
  grey600:  '#5E5852',
  grey700:  '#3F3A35',
  grey800:  '#2D2925',
  grey900:  '#1F2F2B',

  // Accent colors for phases
  rose400:  '#fb7185',
  rose500:  '#f43f5e',
  rose600:  '#e11d48',

  violet400: '#c084fc',
  violet500: '#a855f7',
  violet600: '#9333ea',

  amber400: '#fbbf24',
  amber500: '#f59e0b',
  amber600: '#d97706',

  // Semantic
  green400: '#6FCF97',
  green500: '#2FA084',
  red400:   '#f87171',
  red500:   '#ef4444',
  blue400:  '#60a5fa',
  blue500:  '#3b82f6',

  white:    '#ffffff',
  black:    '#000000',
} as const;

export const lightColors = {
  // Backgrounds — light grey base
  background:       palette.grey200,
  backgroundAlt:    palette.grey100,
  surface:          palette.white,
  surfaceSecondary: palette.grey50,
  surfaceElevated:  palette.white,
  overlay:          'rgba(31,111,95,0.45)',

  // Borders
  border:           palette.grey300,
  borderStrong:     palette.grey400,
  divider:          palette.grey300,

  // Brand — teal/green
  primary:          palette.teal400,  // #2FA084
  primaryLight:     '#EAF4EF',
  primaryLighter:   '#F4FAF7',
  primaryDark:      palette.teal500,  // #1F6F5F

  // Accent — light green
  accent:           palette.teal300,  // #6FCF97
  accentLight:      '#EAF4EF',
  accentLighter:    '#F4FAF7',

  // Wellness — same as primary
  wellness:         palette.teal400,
  wellnessLight:    palette.teal100,
  wellnessLighter:  palette.teal50,

  // Ovulation — amber
  ovulationColor:   palette.amber500,
  ovulationLight:   palette.amber400,
  ovulationLighter: '#F4E8CC',

  // Text
  textPrimary:      palette.grey900,
  textSecondary:    palette.grey500,
  textTertiary:     palette.grey500,
  textDisabled:     palette.grey400,
  textOnPrimary:    palette.white,

  // Semantic
  success:          palette.green500,
  successBg:        '#EAF4EF',
  warning:          palette.amber500,
  warningBg:        '#F4E8CC',
  error:            palette.red500,
  errorBg:          '#fef2f2',
  info:             palette.blue500,
  infoBg:           '#E1EEF5',

  // Cycle phases
  menstrual:        palette.rose500,
  menstrualBg:      '#F7E4DF',
  follicular:       palette.teal300,  // #6FCF97
  follicularBg:     '#F4FAF7',
  ovulation:        palette.amber500,
  ovulationBg:      '#F4E8CC',
  luteal:           palette.violet500,
  lutealBg:         '#faf5ff',

  // Additional palette colors for circular UI
  violet500:        palette.violet500,
  violet600:        palette.violet600,
  rose500:          palette.rose500,
  amber500:         palette.amber500,
  blue400:          palette.blue400,
  blue500:          palette.blue500,

  shadowColor:      palette.grey900,
  black:            palette.black,
} as const;

export const darkColors = {
  // Backgrounds — dark grey base
  background:       palette.grey900,
  backgroundAlt:    palette.grey800,
  surface:          palette.grey800,
  surfaceSecondary: palette.grey700,
  surfaceElevated:  palette.grey700,
  overlay:          'rgba(0,0,0,0.7)',

  border:           palette.grey700,
  borderStrong:     palette.grey600,
  divider:          palette.grey700,

  primary:          palette.teal300,  // #6FCF97
  primaryLight:     palette.teal600 + '40',
  primaryLighter:   palette.teal600 + '20',
  primaryDark:      palette.teal200,

  accent:           palette.teal300,
  accentLight:      palette.teal600 + '40',
  accentLighter:    palette.teal600 + '20',

  wellness:         palette.teal300,
  wellnessLight:    palette.teal600 + '40',
  wellnessLighter:  palette.teal600 + '20',

  ovulationColor:   palette.amber400,
  ovulationLight:   '#78350f40',
  ovulationLighter: '#78350f20',

  textPrimary:      palette.grey50,
  textSecondary:    palette.grey400,
  textTertiary:     palette.grey500,
  textDisabled:     palette.grey600,
  textOnPrimary:    palette.white,

  success:          palette.green400,
  successBg:        '#052e16',
  warning:          palette.amber400,
  warningBg:        '#78350f30',
  error:            palette.red400,
  errorBg:          '#450a0a',
  info:             palette.blue400,
  infoBg:           '#1e3a8a30',

  menstrual:        palette.rose400,
  menstrualBg:      '#88133730',
  follicular:       palette.teal300,
  follicularBg:     palette.teal600 + '30',
  ovulation:        palette.amber400,
  ovulationBg:      '#78350f30',
  luteal:           palette.violet400,
  lutealBg:         '#581c8730',

  // Additional palette colors for circular UI
  violet500:        palette.violet500,
  violet600:        palette.violet600,
  rose500:          palette.rose500,
  amber500:         palette.amber500,
  blue400:          palette.blue400,
  blue500:          palette.blue500,

  shadowColor:      palette.black,
  black:            palette.black,
} as const;

export type AppColors = typeof lightColors | typeof darkColors;
