/**
 * The backend's cycle `regularity_score` is already a PERCENT (0-100, one
 * decimal; see cycle_tracker AnalyticsService). The Insights tile multiplied it
 * by 100 again and showed «۱۰۰۰۰٪». Every consumer goes through this one
 * conversion so the scale is stated in one place.
 */
export function regularityPercent(score: number | null | undefined): number | null {
  if (score == null || !Number.isFinite(score)) { return null; }
  return Math.min(100, Math.max(0, Math.round(score)));
}

/** Colour band for a regularity percent: good above 75, middling above 50. */
export function regularityBand(percent: number): 'good' | 'fair' | 'low' {
  if (percent > 75) { return 'good'; }
  if (percent > 50) { return 'fair'; }
  return 'low';
}
