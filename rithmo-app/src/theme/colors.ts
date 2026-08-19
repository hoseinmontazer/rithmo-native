export const palette = {
  // Base & Neutrals
  canvas:       '#FFFFFF',
  canvasSubtle: '#F8F9FA',
  canvasDark:   '#090A0F',

  ink:          '#111827', // Slate 900
  inkStrong:    '#111827',
  inkMid:       '#374151', // Slate 700
  body:         '#4B5563', // Slate 600
  bodyMid:      '#4B5563',
  mute:         '#6B7280', // Slate 500
  muteSoft:     '#9CA3AF', // Slate 400
  hairline:     '#E5E7EB', // Slate 200
  hairlineSubtle:'#F3F4F6', // Slate 100

  // Restrained Chromatic Phase Palette (HSL-Calibrated)
  roseCoral:    '#E11D48', // Menstrual / Period
  roseSoft:     '#FFE4E6',
  violetSoft:   '#7C3AED', // Follicular
  violetTint:   '#EDE9FE',
  amberWarm:    '#D97706', // Ovulation / Fertile window
  amberTint:    '#FEF3C7',
  azureCalm:    '#0284C7', // Luteal
  azureTint:    '#E0F2FE',
  emeraldClean: '#059669', // Wellness
  emeraldTint:  '#D1FAE5',

  // Semantic mappings for backward compatibility
  accentPurple:   '#7C3AED',
  accentPink:     '#E11D48',
  accentBlue:     '#0284C7',
  accentBlueDeep: '#0284C7',
  accentBlueInfo: '#0284C7',
  accentOrange:   '#D97706',
  accentGreen:    '#059669',
  accentYellow:   '#D97706',
  accentRed:      '#DC2626',

  rose500:   '#E11D48',
  violet500: '#7C3AED',
  violet600: '#6D28D9',
  amber500:  '#D97706',
  blue400:   '#38BDF8',
  blue500:   '#0284C7',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export const lightColors = {
  // Backgrounds & Canvas
  background:       palette.canvas,
  backgroundAlt:    palette.canvasSubtle,
  surface:          palette.canvas,
  surfaceSecondary: palette.canvasSubtle,
  surfaceSubtle:    palette.hairlineSubtle,
  surfaceElevated:  palette.canvas,
  surfaceDark:      palette.ink,
  overlay:          'rgba(17, 24, 39, 0.4)',

  // Borders & Dividers
  border:           palette.hairline,
  borderSubtle:     palette.hairlineSubtle,
  borderStrong:     palette.ink,
  divider:          palette.hairlineSubtle,

  // Brand / Actions
  primary:          palette.ink,
  primaryLight:     palette.hairlineSubtle,
  primaryLighter:   palette.hairline,
  primaryDark:      palette.black,
  primaryPressed:   '#1F2937',

  // Accent
  accent:           palette.azureCalm,
  accentLight:      palette.azureTint,
  accentLighter:    'rgba(2, 132, 199, 0.04)',

  // Wellness
  wellness:         palette.emeraldClean,
  wellnessBg:       palette.emeraldTint,
  wellnessLight:    'rgba(5, 150, 105, 0.12)',
  wellnessLighter:  'rgba(5, 150, 105, 0.05)',

  // Ovulation & Fertile
  ovulationColor:   palette.amberWarm,
  ovulationLight:   palette.amberTint,
  ovulationLighter: 'rgba(217, 119, 6, 0.04)',

  // Text Hierarchy
  textPrimary:      palette.inkStrong,
  textSecondary:    palette.body,
  textTertiary:     palette.mute,
  textMuted:        palette.muteSoft,
  textDisabled:     palette.muteSoft,
  textOnPrimary:    palette.white,
  textOnDark:       palette.canvas,

  // Semantic Feedback
  success:          palette.emeraldClean,
  successBg:        palette.emeraldTint,
  warning:          palette.amberWarm,
  warningBg:        palette.amberTint,
  error:            palette.accentRed,
  errorBg:          '#FEE2E2',
  info:             palette.azureCalm,
  infoBg:           palette.azureTint,

  // Cycle Phase Chromatic Palette
  menstrual:        palette.roseCoral,
  menstrualBg:      palette.roseSoft,
  menstrualBorder:  '#FDA4AF',
  follicular:       palette.violetSoft,
  follicularBg:     palette.violetTint,
  follicularBorder: '#C4B5FD',
  ovulation:        palette.amberWarm,
  ovulationBg:      palette.amberTint,
  ovulationBorder:  '#FCD34D',
  luteal:           palette.azureCalm,
  lutealBg:         palette.azureTint,
  lutealBorder:     '#7DD3FC',

  // Explicit Phase Aliases
  phasePeriod:        palette.roseCoral,
  phasePeriodBg:      palette.roseSoft,
  phaseFollicular:    palette.violetSoft,
  phaseFollicularBg:  palette.violetTint,
  phaseOvulation:     palette.amberWarm,
  phaseOvulationBg:   palette.amberTint,
  phaseFertile:       palette.amberWarm,
  phaseFertileBg:     palette.amberTint,
  phaseLuteal:        palette.azureCalm,
  phaseLutealBg:      palette.azureTint,

  // Compatibility tokens
  violet500:        palette.violet500,
  violet600:        palette.violet600,
  rose500:          palette.rose500,
  amber500:         palette.amber500,
  blue400:          palette.blue400,
  blue500:          palette.blue500,

  shadowColor:      '#111827',
  black:            palette.black,
  white:            palette.white,
} as const;

export const darkColors = {
  // Backgrounds - High contrast, low visual fatigue
  background:       palette.canvasDark,
  backgroundAlt:    '#111318',
  surface:          '#161922',
  surfaceSecondary: '#1E222D',
  surfaceSubtle:    '#1A1D27',
  surfaceElevated:  '#252A37',
  surfaceDark:      '#0F1117',
  overlay:          'rgba(0, 0, 0, 0.75)',

  border:           '#272E3F',
  borderSubtle:     '#1E222D',
  borderStrong:     '#4B5563',
  divider:          '#1E222D',

  primary:          palette.canvas,
  primaryLight:     '#1F2937',
  primaryLighter:   '#374151',
  primaryDark:      '#E5E7EB',
  primaryPressed:   '#D1D5DB',

  accent:           '#38BDF8',
  accentLight:      'rgba(56, 189, 248, 0.15)',
  accentLighter:    'rgba(56, 189, 248, 0.08)',

  wellness:         '#34D399',
  wellnessBg:       'rgba(52, 211, 153, 0.15)',
  wellnessLight:    'rgba(52, 211, 153, 0.15)',
  wellnessLighter:  'rgba(52, 211, 153, 0.08)',

  ovulationColor:   '#FBBF24',
  ovulationLight:   'rgba(251, 191, 36, 0.15)',
  ovulationLighter: 'rgba(251, 191, 36, 0.08)',

  textPrimary:      '#F9FAFB',
  textSecondary:    '#D1D5DB',
  textTertiary:     '#9CA3AF',
  textMuted:        '#6B7280',
  textDisabled:     '#4B5563',
  textOnPrimary:    palette.ink,
  textOnDark:       palette.canvas,

  success:          '#34D399',
  successBg:        'rgba(52, 211, 153, 0.15)',
  warning:          '#FBBF24',
  warningBg:        'rgba(251, 191, 36, 0.15)',
  error:            '#F87171',
  errorBg:          'rgba(248, 113, 113, 0.15)',
  info:             '#38BDF8',
  infoBg:           'rgba(56, 189, 248, 0.15)',

  menstrual:        '#FB7185',
  menstrualBg:      'rgba(251, 113, 133, 0.15)',
  menstrualBorder:  '#E11D48',
  follicular:       '#A78BFA',
  follicularBg:     'rgba(167, 139, 250, 0.15)',
  follicularBorder: '#7C3AED',
  ovulation:        '#FBBF24',
  ovulationBg:      'rgba(251, 191, 36, 0.15)',
  ovulationBorder:  '#D97706',
  luteal:           '#38BDF8',
  lutealBg:         'rgba(56, 189, 248, 0.15)',
  lutealBorder:     '#0284C7',

  phasePeriod:        '#FB7185',
  phasePeriodBg:      'rgba(251, 113, 133, 0.15)',
  phaseFollicular:    '#A78BFA',
  phaseFollicularBg:  'rgba(167, 139, 250, 0.15)',
  phaseOvulation:     '#FBBF24',
  phaseOvulationBg:   'rgba(251, 191, 36, 0.15)',
  phaseFertile:       '#FBBF24',
  phaseFertileBg:     'rgba(251, 191, 36, 0.15)',
  phaseLuteal:        '#38BDF8',
  phaseLutealBg:      'rgba(56, 189, 248, 0.15)',

  violet500:        palette.violet500,
  violet600:        palette.violet600,
  rose500:          palette.rose500,
  amber500:         palette.amber500,
  blue400:          palette.blue400,
  blue500:          palette.blue500,

  shadowColor:      '#000000',
  black:            palette.black,
  white:            palette.white,
} as const;

export type AppColors = typeof lightColors | typeof darkColors;
