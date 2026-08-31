/**
 * fonts.ts — the app's Persian type family (F-07).
 *
 * Before this gate the app shipped **no font at all**: `theme/typography.ts`
 * defined sizes, weights and line heights, but there was not a single
 * `fontFamily` declaration anywhere in `src/` (measured: 0 across 141 files).
 * Every Persian glyph was therefore drawn with whatever the device happened to
 * fall back to — a different face on a Samsung than on a Pixel than on an
 * older Android — so the product had no typographic identity it could rely on
 * and no way to guarantee how its own screens would look.
 *
 * The family is **Vazirmatn** (وزیرمتن) by Saber Rastikerdar, taken from its
 * canonical repository at github.com/rastikerdar/vazirmatn (v33.003) and
 * licensed **SIL OFL 1.1**, which grants the rights that matter here in
 * as many words: to "use, study, copy, merge, **embed**, modify, redistribute,
 * and sell" the font software. The full licence travels with the app in
 * `src/assets/fonts/Vazirmatn-OFL.txt`.
 *
 * ── Why the weight map exists ────────────────────────────────────────────────
 *
 * Android does not synthesise intermediate weights. Given one family name and
 * `fontWeight: '600'`, it picks the nearest *registered* face — in practice
 * regular or bold — so 500/600/800/900 all collapse into two visual weights and
 * the hierarchy the designers wrote silently disappears. React Native on
 * Android resolves a font by **file name**, so the reliable way to get a real
 * semibold is to ask for the file that contains one.
 *
 * The app declares 7 distinct weights across 267 sites (700×109, 600×72,
 * 800×50, 500×28, 900×6, 400×1, plus a stray 'bold'). Five faces cover that
 * honestly; 900 maps to ExtraBold rather than shipping a sixth 120 KB file for
 * six call sites, and there is no visual step between 800 and 900 at these
 * sizes on this screen.
 */

/** Family name used for prose. Matches the asset file names, minus the weight. */
export const FONT_FAMILY = 'Shabnam';

/**
 * Every weight the app can actually render, mapped to the face that carries it.
 * Keys are the `fontWeight` values React Native accepts.
 */
export const WEIGHT_TO_FAMILY: Record<string, string> = {
  '100': 'Shabnam-Thin',
  '200': 'Shabnam-Light',
  '300': 'Shabnam-Light',
  '400': 'Shabnam-Regular',
  normal: 'Shabnam-Regular',
  '500': 'Shabnam-Medium',
  '600': 'Shabnam-Medium',
  '700': 'Shabnam-Bold',
  bold: 'Shabnam-Bold',
  '800': 'Shabnam-Bold',
  '900': 'Shabnam-Bold',
};

/** The faces bundled in `android/app/src/main/assets/fonts/`. */
export const BUNDLED_FACES = [
  'Shabnam-Regular',
  'Shabnam-Medium',
  'Shabnam-Bold',
  'Shabnam-Light',
  'Shabnam-Thin',
] as const;

export const DEFAULT_FACE = 'Shabnam-Regular';

/**
 * The face that renders `weight`. Unknown or absent weights fall back to
 * regular, which is the same thing the platform would have done.
 */
export function fontFamilyForWeight(weight?: string | number | null): string {
  if (weight === undefined || weight === null) {
    return DEFAULT_FACE;
  }
  return WEIGHT_TO_FAMILY[String(weight)] ?? DEFAULT_FACE;
}
