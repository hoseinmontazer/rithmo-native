/**
 * Type.
 *
 * ── The ladder ──────────────────────────────────────────────────────────────
 *
 * `STEP` is the only place a font size is decided. Everything below names a
 * step; nothing below invents a number.
 *
 * That indirection exists because three vocabularies had grown here — a
 * semantic scale (`display`, `title`, `body`…), a numeric "compatibility"
 * scale (`xs`, `sm`, `base`…) and later the `textRoles` map — and they had
 * already drifted apart. `textRoles` introduced 16 and 10, which existed in
 * neither of the other two, and `sm: 14` is the single most-used size in the
 * app (123 call sites) while no semantic name pointed at it. Fourteen distinct
 * sizes had accumulated, which is a list rather than a scale.
 *
 * Because the vocabularies now share one home, the whole ladder can be
 * retuned from `STEP` alone — and a test asserts that every size in every
 * vocabulary is a member of it.
 *
 * The ladder was raised roughly one step (reading text 15 → 17, the rest
 * scaled with it) after the previous sizes read as too small on device. The
 * *shape* is unchanged — every step stays distinct and ordered, so the
 * hierarchy verified on hardware across F-01…F-06 still holds; only the
 * baseline moved. `textRoles` line heights moved with it: they are absolute
 * (see the note below on Persian ascenders) so they do not scale themselves,
 * and leaving them behind would have clipped the taller text.
 *
 * To dial the overall text size further, change `STEP` here and nothing else.
 *
 * `5xl` (48) was removed: nothing referenced it.
 */

/** Every font size the product may use. Adding a step is a design decision. */
export const STEP = {
  /** Bottom tab labels — the one place this small is acceptable. */
  micro:    11,
  /** Eyebrows and uppercase metadata. */
  overline: 12,
  /** Badges, form labels, category tags. */
  tiny:     13,
  /** Secondary descriptions, timestamps. */
  small:    14,
  /** The app's most-used secondary size. */
  compact:  15,
  /** Standard reading text. */
  base:     17,
  /** Card headings. */
  medium:   18,
  /** Section headers. */
  large:    20,
  /** Metric values in stat rows. */
  xlarge:   22,
  /** Screen titles. */
  heading:  26,
  /** Hero numerals. */
  display:  34,
  /** Oversized impact numbers. */
  hero:     42,
  /** The largest step in the product. */
  giant:    46,
} as const;

export type FontStep = keyof typeof STEP;

export const typography = {
  // ── Semantic scale ────────────────────────────────────────────────────────
  display:    STEP.display,  // Hero cycle day counters & primary impact numbers
  heading:    STEP.heading,  // Screen titles
  title:      STEP.large,    // Section headers & major card titles
  body:       STEP.base,     // Standard body & conversational text
  bodyMedium: STEP.base,     // Emphasized body text
  bodySmall:  STEP.small,    // Secondary descriptions & compact lists
  caption:    STEP.small,    // Dates, timestamps & metadata
  label:      STEP.tiny,     // Badges, form labels & category tags
  button:     STEP.base,     // Button & interactive action labels
  overline:   STEP.overline, // Eyebrows & uppercase metadata

  // ── Numeric scale ─────────────────────────────────────────────────────────
  // Retained because the app overwhelmingly speaks in these names — `xs`, `sm`
  // and `base` alone account for ~340 call sites. They are the same ladder
  // under different labels, not a second scale.
  xs:    STEP.tiny,
  sm:    STEP.compact,
  base:  STEP.base,
  md:    STEP.large,
  lg:    STEP.xlarge,
  xl:    STEP.heading,
  '2xl': STEP.display,
  '3xl': STEP.hero,
  '4xl': STEP.giant,

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
  display:      { fontSize: STEP.display,  fontWeight: '800', lineHeight: 43, letterSpacing: -0.4 },
  /** Screen titles. */
  screenTitle:  { fontSize: STEP.heading,  fontWeight: '700', lineHeight: 37 },
  /** Section headers within a screen. */
  sectionTitle: { fontSize: STEP.large,    fontWeight: '700', lineHeight: 30 },
  /** Card headings. */
  cardTitle:    { fontSize: STEP.medium,   fontWeight: '600', lineHeight: 28 },
  /** Standard reading text. */
  body:         { fontSize: STEP.base,     fontWeight: '400', lineHeight: 28 },
  /** Body text that carries emphasis without becoming a heading. */
  bodyEmphasis: { fontSize: STEP.base,     fontWeight: '600', lineHeight: 28 },
  /**
   * The dense secondary size the app actually reaches for most often.
   *
   * `typography.sm` (14) is used at ~123 call sites and no role named it, so
   * anyone working from `textRoles` alone could not reproduce the app's own
   * most common text. Naming it is the point of this entry.
   */
  bodyCompact:  { fontSize: STEP.compact,  fontWeight: '400', lineHeight: 24 },
  /** Secondary descriptions and compact lists. */
  bodySmall:    { fontSize: STEP.small,    fontWeight: '400', lineHeight: 23 },
  /** Dates, timestamps, metadata. */
  caption:      { fontSize: STEP.small,    fontWeight: '400', lineHeight: 22 },
  /** Badges, form labels, category tags. */
  label:        { fontSize: STEP.tiny,     fontWeight: '500', lineHeight: 20 },
  /** Interactive action labels. */
  button:       { fontSize: STEP.base,     fontWeight: '600', lineHeight: 25 },
  /** Metric values in stat rows — smaller than display, still dominant. */
  metric:       { fontSize: STEP.xlarge,   fontWeight: '700', lineHeight: 31 },
  /** Bottom tab labels. */
  tabLabel:     { fontSize: STEP.micro,    fontWeight: '500', lineHeight: 17 },
} as const satisfies Record<string, Role>;

export type TextRole = keyof typeof textRoles;

