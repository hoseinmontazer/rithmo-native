import { Platform } from 'react-native';

export const typography = {
  // Size scale mapped to Webflow system closely
  xs:    12, // smaller labels
  sm:    14, // button text, nav links
  base:  16, // body-md
  md:    18,
  lg:    20,
  xl:    24, // body-lg / display-sm
  '2xl': 32, // display-md
  '3xl': 40, 
  '4xl': 44, // display-lg
  '5xl': 48, // display-xxl start
  
  // Custom Webflow typography classes could be mapped here conceptually, 
  // but we keep the same naming convention so we don't break existing components immediately.

  // Line heights
  lineHeightTight:   1.04,
  lineHeightSnug:    1.2,
  lineHeightNormal:  1.6,
  lineHeightRelaxed: 1.8,

  // Letter spacing
  trackingTight:  -0.8,
  trackingNormal: -0.16,
  trackingWide:    0,
  trackingWidest:  1.5, // eyebrow

  // Weights
  weightRegular:  '400' as const,
  weightMedium:   '500' as const,
  weightSemiBold: '600' as const,
  weightBold:     '700' as const,
  weightBlack:    '900' as const,
} as const;
