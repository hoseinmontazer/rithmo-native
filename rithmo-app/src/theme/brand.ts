/**
 * brand.ts — brand gradient stops for premium moments (SVG LinearGradient).
 *
 * hero         → Home hero header, cycle hero card accent, paywall-free hero
 * gold         → Premium moments (paywall, premium cards, crown accents)
 * premiumGreen → Profile's premium card specifically — the "Rhythmo App"
 *                design mockup (claude.ai/design project
 *                70fddc34-0abb-4704-9a1e-2eb45e62aead) treats premium there
 *                as an intensified version of the BRAND green, not the gold
 *                accent used on the paywall/crown: its own "Visual language"
 *                section literally labels `linear-gradient(160deg,#2F5D50,
 *                #3E7A63)` as "premium gradient". Both stops clear AA for
 *                white text (7.49:1 / 5.04:1) — verified, not carried over
 *                from `gold`.
 */

interface BrandGradient {
  heroFrom: string;
  heroTo:   string;
  goldFrom: string;
  goldTo:   string;
  premiumGreenFrom: string;
  premiumGreenTo:   string;
}

// Both stops must carry `textOnDark`, because the hero greeting sits across
// the whole ramp — not just its dark end. The rose gradient this replaced
// failed that: its light stop (#C2688F) measured 3.35:1 against the greeting,
// short of AA. These measure 5.06:1 and 9.51:1.
const light: BrandGradient = {
  heroFrom: '#1B743C',
  heroTo:   '#0A4520',
  goldFrom: '#E3B75C',
  goldTo:   '#A67C2E',
  premiumGreenFrom: '#2F5D50',
  premiumGreenTo:   '#3E7A63',
};

// 11.16:1 and 15.59:1 against `textOnDark`.
const dark: BrandGradient = {
  heroFrom: '#213D2B',
  heroTo:   '#112217',
  goldFrom: '#8A6A2A',
  goldTo:   '#4A3818',
  // Reuses `hero`'s dark pair rather than inventing new values: already a
  // verified AA-clean dark green (11.16:1 / 15.59:1 against textOnDark).
  premiumGreenFrom: '#213D2B',
  premiumGreenTo:   '#112217',
};

export function getBrandGradient(isDark: boolean): BrandGradient {
  return isDark ? dark : light;
}
