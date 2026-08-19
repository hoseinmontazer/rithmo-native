export const typography = {
  // Semantic Type Scale (supporting English and Persian text)
  display:   32, // Hero cycle day counters & primary impact numbers
  heading:   24, // Screen titles
  title:     18, // Section headers & major card titles
  body:      15, // Standard body & conversational text
  bodyMedium:15, // Emphasized body text
  bodySmall: 13, // Secondary descriptions & compact lists
  caption:   13, // Dates, timestamps & metadata
  label:     12, // Badges, form labels & category tags
  button:    15, // Button & interactive action labels
  overline:  11, // Eyebrows & uppercase metadata

  // Compatibility scale
  xs:    12,
  sm:    14,
  base:  15,
  md:    18,
  lg:    20,
  xl:    24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 44,
  '5xl': 48,

  // Line heights (calibrated for Persian and Latin scripts)
  lineHeightTight:   1.15,
  lineHeightSnug:    1.25,
  lineHeightNormal:  1.5,
  lineHeightRelaxed: 1.7,

  // Letter spacing
  trackingTight:  -0.4,
  trackingNormal: 0,
  trackingWide:   0.2,
  trackingWidest: 0.8,

  // Font Weights
  weightRegular:  '400' as const,
  weightMedium:   '500' as const,
  weightSemiBold: '600' as const,
  weightBold:     '700' as const,
  weightBlack:    '800' as const,
} as const;

