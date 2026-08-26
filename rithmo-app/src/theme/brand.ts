/**
 * brand.ts — brand gradient stops for premium moments (SVG LinearGradient).
 *
 * hero  → Home hero header, cycle hero card accent, paywall-free hero
 * gold  → Premium moments (paywall, premium cards, crown accents)
 */

interface BrandGradient {
  heroFrom: string;
  heroTo:   string;
  goldFrom: string;
  goldTo:   string;
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
};

// 11.16:1 and 15.59:1 against `textOnDark`.
const dark: BrandGradient = {
  heroFrom: '#213D2B',
  heroTo:   '#112217',
  goldFrom: '#8A6A2A',
  goldTo:   '#4A3818',
};

export function getBrandGradient(isDark: boolean): BrandGradient {
  return isDark ? dark : light;
}
