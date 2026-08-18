export const palette = {
  // Base & Neutrals
  canvas: '#FFFFFF',
  primary: '#080808',
  primaryHover: '#1f1f1f',
  onPrimary: '#FFFFFF',
  
  ink: '#080808',
  inkStrong: '#222222',
  body: '#363636',
  bodyMid: '#5A5A5A',
  mute: '#898989',
  muteSoft: '#ABABAB',
  hairline: '#D8D8D8',

  // 5-Stop Chromatic Category Palette
  accentPurple: '#7A3DFF',
  accentPink: '#ED52CB',
  accentBlue: '#3B89FF',
  accentBlueDeep: '#006ACC',
  accentBlueInfo: '#146EF5',
  accentOrange: '#FF6B00',
  accentGreen: '#00D722',
  accentYellow: '#FFAE13',
  accentRed: '#EE1D36',

  // Semantic mappings to palette for compatibility
  rose500: '#EE1D36',
  violet500: '#7A3DFF',
  violet600: '#5c2ebd',
  amber500: '#FFAE13',
  blue400: '#3B89FF',
  blue500: '#146EF5',

  white: '#ffffff',
  black: '#000000',
} as const;

export const lightColors = {
  // Backgrounds
  background:       palette.canvas,
  backgroundAlt:    '#F5F5F5',
  surface:          palette.white,
  surfaceSecondary: '#FAFAFA',
  surfaceElevated:  palette.white,
  surfaceDark:      palette.ink,
  overlay:          'rgba(8, 8, 8, 0.4)',

  // Borders
  border:           palette.hairline,
  borderStrong:     palette.ink,
  divider:          palette.hairline,

  // Brand 
  primary:          palette.primary,
  primaryLight:     palette.muteSoft,
  primaryLighter:   palette.hairline,
  primaryDark:      palette.primaryHover,

  // Accent
  accent:           palette.accentBlueDeep,
  accentLight:      'rgba(0, 106, 204, 0.1)',
  accentLighter:    'rgba(0, 106, 204, 0.05)',

  // Wellness
  wellness:         palette.accentGreen,
  wellnessLight:    'rgba(0, 215, 34, 0.1)',
  wellnessLighter:  'rgba(0, 215, 34, 0.05)',

  // Ovulation
  ovulationColor:   palette.accentOrange,
  ovulationLight:   'rgba(255, 107, 0, 0.1)',
  ovulationLighter: 'rgba(255, 107, 0, 0.05)',

  // Text
  textPrimary:      palette.inkStrong,
  textSecondary:    palette.bodyMid,
  textTertiary:     palette.mute,
  textDisabled:     palette.muteSoft,
  textOnPrimary:    palette.onPrimary,
  textOnDark:       palette.canvas,

  // Semantic
  success:          palette.accentGreen,
  successBg:        'rgba(0, 215, 34, 0.1)',
  warning:          palette.accentYellow,
  warningBg:        'rgba(255, 174, 19, 0.1)',
  error:            palette.accentRed,
  errorBg:          'rgba(238, 29, 54, 0.1)',
  info:             palette.accentBlueInfo,
  infoBg:           'rgba(20, 110, 245, 0.1)',

  // Cycle phases mapped to Webflow 5-stop chromatic scale
  menstrual:        palette.accentPink,
  menstrualBg:      'rgba(237, 82, 203, 0.1)',
  follicular:       palette.accentPurple,
  follicularBg:     'rgba(122, 61, 255, 0.1)',
  ovulation:        palette.accentOrange,
  ovulationBg:      'rgba(255, 107, 0, 0.1)',
  luteal:           palette.accentBlue,
  lutealBg:         'rgba(59, 137, 255, 0.1)',

  // Additional palette colors for compatibility
  violet500:        palette.violet500,
  violet600:        palette.violet600,
  rose500:          palette.rose500,
  amber500:         palette.amber500,
  blue400:          palette.blue400,
  blue500:          palette.blue500,

  shadowColor:      '#000000',
  black:            palette.black,
} as const;

export const darkColors = {
  // Backgrounds - High contrast dark mode
  background:       palette.primary, // #080808
  backgroundAlt:    '#121212',
  surface:          '#1a1a1a',
  surfaceSecondary: '#242424',
  surfaceElevated:  '#2a2a2a',
  surfaceDark:      palette.primaryHover,
  overlay:          'rgba(0,0,0,0.8)',

  border:           '#333333',
  borderStrong:     '#555555',
  divider:          '#333333',

  primary:          palette.canvas, // White as primary action on dark mode
  primaryLight:     '#CCCCCC',
  primaryLighter:   '#AAAAAA',
  primaryDark:      '#E5E5E5',

  accent:           palette.accentBlue,
  accentLight:      'rgba(59, 137, 255, 0.2)',
  accentLighter:    'rgba(59, 137, 255, 0.1)',

  wellness:         palette.accentGreen,
  wellnessLight:    'rgba(0, 215, 34, 0.2)',
  wellnessLighter:  'rgba(0, 215, 34, 0.1)',

  ovulationColor:   palette.accentOrange,
  ovulationLight:   'rgba(255, 107, 0, 0.2)',
  ovulationLighter: 'rgba(255, 107, 0, 0.1)',

  textPrimary:      '#FFFFFF',
  textSecondary:    '#CCCCCC',
  textTertiary:     '#999999',
  textDisabled:     '#666666',
  textOnPrimary:    palette.ink, // Black text on white primary button
  textOnDark:       '#FFFFFF',

  success:          palette.accentGreen,
  successBg:        'rgba(0, 215, 34, 0.15)',
  warning:          palette.accentYellow,
  warningBg:        'rgba(255, 174, 19, 0.15)',
  error:            palette.accentRed,
  errorBg:          'rgba(238, 29, 54, 0.15)',
  info:             palette.accentBlueInfo,
  infoBg:           'rgba(20, 110, 245, 0.15)',

  menstrual:        palette.accentPink,
  menstrualBg:      'rgba(237, 82, 203, 0.15)',
  follicular:       palette.accentPurple,
  follicularBg:     'rgba(122, 61, 255, 0.15)',
  ovulation:        palette.accentOrange,
  ovulationBg:      'rgba(255, 107, 0, 0.15)',
  luteal:           palette.accentBlue,
  lutealBg:         'rgba(59, 137, 255, 0.15)',

  violet500:        palette.violet500,
  violet600:        palette.violet600,
  rose500:          palette.rose500,
  amber500:         palette.amber500,
  blue400:          palette.blue400,
  blue500:          palette.blue500,

  shadowColor:      '#000000',
  black:            palette.black,
} as const;


export type AppColors = typeof lightColors | typeof darkColors;
