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

const light: BrandGradient = {
  heroFrom: '#C2688F',
  heroTo:   '#8E3A60',
  goldFrom: '#E3B75C',
  goldTo:   '#A67C2E',
};

const dark: BrandGradient = {
  heroFrom: '#6B3350',
  heroTo:   '#3E2033',
  goldFrom: '#8A6A2A',
  goldTo:   '#4A3818',
};

export function getBrandGradient(isDark: boolean): BrandGradient {
  return isDark ? dark : light;
}
