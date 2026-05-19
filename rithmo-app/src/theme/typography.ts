import { Platform } from 'react-native';

export const typography = {
  // Size scale
  xs:    11,
  sm:    13,
  base:  15,
  md:    16,
  lg:    18,
  xl:    20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 44,

  // Line heights
  lineHeightTight:   1.2,
  lineHeightSnug:    1.35,
  lineHeightNormal:  1.5,
  lineHeightRelaxed: 1.65,

  // Letter spacing
  trackingTight:  -0.4,
  trackingNormal:  0,
  trackingWide:    0.3,
  trackingWidest:  1.2,

  // Weights
  weightRegular:  '400' as const,
  weightMedium:   '500' as const,
  weightSemiBold: '600' as const,
  weightBold:     '700' as const,
  weightBlack:    '900' as const,
} as const;
