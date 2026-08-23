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

// ── Semantic type roles (F-07) ───────────────────────────────────────────────
//
// The numeric scale above is kept exactly as it was: 92% of the app's font
// sizes already resolve through it and that hierarchy was verified on hardware
// across F-01…F-06. What was missing was a *named* role, so that new code asks
// for "card title" rather than re-deciding `fontSize: 17, fontWeight: '700'`
// on the spot — which is how a scale with 15 stray literal sizes happens.
//
// Each role names only what it needs to. Family is deliberately absent: it is
// applied once, globally, from the weight (see theme/applyGlobalFont.ts), so a
// role that hard-coded a family would have to repeat the whole weight→face
// mapping and would drift from it.
//
// `lineHeight` is absolute, not a multiplier, because Persian ascenders and
// descenders are taller than Latin ones and a tight multiplier on a 15px body
// clips them. Values are the scale's own multipliers resolved against the
// role's size and rounded up.

type Role = {
  fontSize: number;
  fontWeight: '400' | '500' | '600' | '700' | '800';
  lineHeight: number;
  letterSpacing?: number;
};

export const textRoles = {
  /** Hero numerals — cycle day, primary impact values. */
  display:      { fontSize: 32, fontWeight: '800', lineHeight: 40, letterSpacing: -0.4 },
  /** Screen titles. */
  screenTitle:  { fontSize: 24, fontWeight: '700', lineHeight: 34 },
  /** Section headers within a screen. */
  sectionTitle: { fontSize: 18, fontWeight: '700', lineHeight: 27 },
  /** Card headings. */
  cardTitle:    { fontSize: 16, fontWeight: '600', lineHeight: 25 },
  /** Standard reading text. */
  body:         { fontSize: 15, fontWeight: '400', lineHeight: 25 },
  /** Body text that carries emphasis without becoming a heading. */
  bodyEmphasis: { fontSize: 15, fontWeight: '600', lineHeight: 25 },
  /** Secondary descriptions and compact lists. */
  bodySmall:    { fontSize: 13, fontWeight: '400', lineHeight: 21 },
  /** Dates, timestamps, metadata. */
  caption:      { fontSize: 13, fontWeight: '400', lineHeight: 20 },
  /** Badges, form labels, category tags. */
  label:        { fontSize: 12, fontWeight: '500', lineHeight: 18 },
  /** Interactive action labels. */
  button:       { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  /** Metric values in stat rows — smaller than display, still dominant. */
  metric:       { fontSize: 20, fontWeight: '700', lineHeight: 28 },
  /** Bottom tab labels. */
  tabLabel:     { fontSize: 10, fontWeight: '500', lineHeight: 15 },
} as const satisfies Record<string, Role>;

export type TextRole = keyof typeof textRoles;

