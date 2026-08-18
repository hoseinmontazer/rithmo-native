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
} as const;

export const borderRadius = {
  xs:      2,
  sm:      4,     // Button & Badge standard (Tight 4px)
  md:      8,     // Card standard
  lg:      12,
  xl:      16,
  card:    8,     // Sylvan was 23, Webflow uses crisp 8px cards
  control: 4,     // Sylvan was 23, Webflow uses strict 4px buttons
  '2xl':   24,
  '3xl':   32,
  pill:    9999,
  full:    9999,
} as const;

export const shadow = {
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: { // Level 2 Webflow shadow approximation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 13 },
    shadowOpacity: 0.08,
    shadowRadius: 13,
    elevation: 6,
  },
  lg: { // Level 3 Webflow shadow approximation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 10,
  },
  brand: {
    shadowColor: '#080808',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 7,
    elevation: 3,
  },
} as const;
