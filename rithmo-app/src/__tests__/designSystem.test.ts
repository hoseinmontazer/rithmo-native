// `__dirname` is provided by Jest's CommonJS runtime; the app's tsconfig
// does not include @types/node, so declare it rather than pulling in
// Node typings for one test file.
declare const __dirname: string;

/**
 * F-03 design-system contracts.
 *
 * Three defects motivated these, and each was invisible to the compiler:
 * two tab destinations resolving to the same glyph, a text token failing
 * WCAG AA, and dead routes staying registered. A type checker cannot see
 * any of them, so they are pinned here instead.
 */

import { TAB_ICONS, TAB_ICONS_ACTIVE, PROFILE_ICONS, ICON_SIZE } from '@design-system/iconography';
import { lightColors, darkColors } from '@theme/colors';

// ── WCAG relative luminance / contrast ─────────────────────────────────────

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(fg: string, bg: string): number {
  const [a, b] = [luminance(fg), luminance(bg)];
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

const AA_NORMAL_TEXT = 4.5;

describe('tab iconography', () => {
  it('gives every destination a distinct glyph', () => {
    // چرخه and الگوها both used `icons.search` and were indistinguishable.
    const glyphs = Object.values(TAB_ICONS);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });

  it('covers exactly the five tab destinations', () => {
    expect(Object.keys(TAB_ICONS).sort()).toEqual(
      ['cycle', 'home', 'log', 'patterns', 'profile'],
    );
  });

  it('has an active counterpart for every destination', () => {
    expect(Object.keys(TAB_ICONS_ACTIVE).sort()).toEqual(Object.keys(TAB_ICONS).sort());
  });

  it('keeps active glyphs distinct from each other too', () => {
    const glyphs = Object.values(TAB_ICONS_ACTIVE);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });

  it('uses only kebab-case MaterialCommunityIcons names', () => {
    for (const name of [...Object.values(TAB_ICONS), ...Object.values(TAB_ICONS_ACTIVE), ...Object.values(PROFILE_ICONS)]) {
      expect(name).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('exposes a fixed size scale so call sites stop inventing their own', () => {
    expect(ICON_SIZE.tab).toBe(24);
    for (const size of Object.values(ICON_SIZE)) {
      expect(typeof size).toBe('number');
    }
  });
});

describe('profile iconography', () => {
  it('gives each account row a semantic name', () => {
    for (const key of ['history', 'medications', 'logout', 'deleteAccount', 'premium']) {
      expect(PROFILE_ICONS).toHaveProperty(key);
    }
  });

  it('does not reuse one glyph for unrelated destructive and benign rows', () => {
    // logout and delete-account previously read as interchangeable.
    expect(PROFILE_ICONS.logout).not.toBe(PROFILE_ICONS.deleteAccount);
  });
});

describe('text colour contrast (WCAG AA, normal text)', () => {
  const surfaces = (theme: typeof lightColors) => [
    ['surface', theme.surface],
    ['background', theme.background],
  ] as const;

  for (const [themeName, theme] of [['light', lightColors], ['dark', darkColors]] as const) {
    describe(themeName, () => {
      for (const token of ['textPrimary', 'textSecondary', 'textTertiary'] as const) {
        for (const [surfaceName, surface] of surfaces(theme)) {
          it(`${token} on ${surfaceName} meets AA`, () => {
            const ratio = contrast(theme[token] as string, surface as string);
            expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
          });
        }
      }

      it('preserves the visual hierarchy primary > secondary > tertiary', () => {
        // Fixing contrast must not flatten the scale into three identical
        // greys — subordinate text has to stay subordinate.
        const c = (t: string) => contrast(t, theme.surface as string);
        expect(c(theme.textPrimary as string)).toBeGreaterThan(c(theme.textSecondary as string));
        expect(c(theme.textSecondary as string)).toBeGreaterThan(c(theme.textTertiary as string));
      });
    });
  }

  it('leaves textDisabled below AA by design', () => {
    // WCAG 1.4.3 exempts inactive components; raising this would make
    // disabled controls look enabled.
    expect(contrast(lightColors.textDisabled as string, lightColors.surface as string))
      .toBeLessThan(AA_NORMAL_TEXT);
  });
});

/**
 * Every icon name in the app must be a real MaterialCommunityIcons glyph.
 *
 * An unknown name does not throw — it renders as a missing-character box and
 * logs a prop-type warning that is easy to miss in a busy Metro log. That is
 * how `pill-off` (not a glyph in this version; only `pill` and `pillar` exist)
 * shipped on the Medications empty state. Typos in this API are silent, so the
 * check has to be mechanical: scan the source for icon names and validate them
 * against the glyphmap that actually ships with the installed package, rather
 * than against a hand-maintained list that would drift.
 */
describe('icon names resolve to real glyphs', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const glyphs: Record<string, number> = require('react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');

  /** Collect `<Icon name="x" />`, `name={'x'}`, and the iconography map values. */
  function collectIconNames(): Array<{ file: string; line: number; name: string }> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const root = path.join(__dirname, '..');
    const out: Array<{ file: string; line: number; name: string }> = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Skip the test tree: this file contains the scanner's own regex
          // source, whose literal text would otherwise match as icon usages.
          if (entry.name !== 'node_modules' && entry.name !== '__tests__') { walk(full); }
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) { continue; }
        const src: string = fs.readFileSync(full, 'utf8');
        const isMap = full.includes(path.join('design-system', 'iconography'));
        // `TAB_ICON_ART` maps tab destinations to PNG keys in `assets/icons`,
        // not to MaterialCommunityIcons glyphs. It lives in the same file
        // because that file owns "what a destination looks like", but its
        // values must not be checked against the glyph font — `menstruation`
        // and `profile` are filenames, not glyph names.
        let inArtMap = false;
        src.split('\n').forEach((line: string, i: number) => {
          if (/export const TAB_ICON_ART\s*=/.test(line)) { inArtMap = true; }
          else if (inArtMap && /^\}/.test(line)) { inArtMap = false; }
          if (inArtMap) { return; }
          const patterns = [/<Icon\s+name="([a-z0-9-]+)"/g, /name=\{'([a-z0-9-]+)'\}/g];
          if (isMap) { patterns.push(/^\s*\w+:\s*'([a-z0-9-]+)',/g); }
          for (const re of patterns) {
            let m: RegExpExecArray | null;
            while ((m = re.exec(line)) !== null) {
              out.push({ file: path.relative(root, full), line: i + 1, name: m[1] });
            }
          }
        });
      }
    };
    walk(root);
    return out;
  }

  const refs = collectIconNames();

  it('finds icon usages to check', () => {
    // Guards the scanner itself: a regex that silently matches nothing would
    // make every assertion below vacuously pass.
    expect(refs.length).toBeGreaterThan(30);
  });

  it('has no unknown glyph names anywhere in src', () => {
    const bad = refs.filter((r) => !(r.name in glyphs));
    expect(bad.map((r) => `${r.file}:${r.line} ${r.name}`)).toEqual([]);
  });
});

/**
 * Symptom glyphs (F-04).
 *
 * The scanner above already validates SYMPTOM_ICONS' values, because the
 * iconography map is one of the files it walks. These tests cover what the
 * scanner cannot: that the map stays in step with the vocabulary the app can
 * actually receive, and that the fallback is genuinely neutral.
 */
describe('symptom icon mapping', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const glyphs: Record<string, number> = require('react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');
  const { SYMPTOM_ICONS, SYMPTOM_FALLBACK_ICON, symptomIcon } = require('@design-system/iconography');
  const { SYMPTOMS } = require('@constants/symptoms');

  it('maps every symptom the pickers can offer', () => {
    const unmapped = SYMPTOMS
      .map((s: { code: string }) => s.code)
      .filter((code: string) => !(code in SYMPTOM_ICONS));
    expect(unmapped).toEqual([]);
  });

  it('resolves every mapped glyph and the fallback', () => {
    const bad = Object.entries(SYMPTOM_ICONS)
      .filter(([, icon]) => !((icon as string) in glyphs))
      .map(([code, icon]) => `${code} -> ${icon}`);
    expect(bad).toEqual([]);
    expect(SYMPTOM_FALLBACK_ICON in glyphs).toBe(true);
  });

  it('falls back neutrally for a symptom the user invented', () => {
    // A free-form code is real data, not an error. It must not be given a
    // glyph that asserts something about a symptom we do not recognise.
    expect(symptomIcon('a_symptom_she_typed_herself')).toBe(SYMPTOM_FALLBACK_ICON);
    expect(Object.values(SYMPTOM_ICONS)).not.toContain(SYMPTOM_FALLBACK_ICON);
  });

  it('gives distinct symptoms distinct glyphs', () => {
    // Two different symptoms sharing one icon makes the icon uninformative.
    const icons = Object.values(SYMPTOM_ICONS);
    expect(new Set(icons).size).toBe(icons.length);
  });
});

/**
 * Foreground/background token pairing (F-06).
 *
 * The theme is light/dark aware, so a literal colour is theme-blind by
 * construction. Three screens painted their primary call-to-action label
 * `#FFFFFF` on `colors.primary`. In light mode `textOnPrimary` IS #FFFFFF, so
 * it looked right and nobody noticed; in dark mode `primary` is a light mint
 * (#6FD3A6) and the paired token is a deep pine (#0B1F16), so the literal
 * measured 1.82:1 against 9.45:1 for the token. Dark mode is a real, persisted
 * user setting, so this shipped broken for anyone using it.
 */
describe('foreground tokens are paired with their background', () => {
  const pairs: Array<[keyof typeof lightColors, keyof typeof lightColors, number]> = [
    ['textOnPrimary', 'primary', AA_NORMAL_TEXT],
    // The auth hero is a gradient from `primaryLight` into `surface`, so the
    // wordmark sits over a RANGE, not a single colour. Both ends must carry it.
    ['primary', 'primaryLight', AA_NORMAL_TEXT],
    ['primary', 'surface', AA_NORMAL_TEXT],
  ];

  for (const [themeName, theme] of [['light', lightColors], ['dark', darkColors]] as const) {
    for (const [fg, bg, min] of pairs) {
      it(`${String(fg)} on ${String(bg)} meets AA in ${themeName}`, () => {
        expect(contrast(theme[fg] as string, theme[bg] as string)).toBeGreaterThanOrEqual(min);
      });
    }
  }

  it('no screen paints a literal colour onto colors.primary', () => {
    /*
     * Narrow on purpose: the checkable contract is "a foreground literal must
     * not sit on colors.primary", not "no file may contain a hex string". A
     * blanket hex ban produces false positives — foregrounds on the brand
     * gradient (dark in both themes) and ErrorBoundary, which renders before
     * the theme context exists and therefore cannot use tokens.
     *
     * The scan looks for a `backgroundColor: colors.primary` and a literal
     * `color` within the same element block. That is exactly the shape that
     * shipped broken in 13 places across Onboarding, PartnerManage,
     * Medications, StoryCard, CycleTracker and Upgrade.
     *
     * Widened after device verification: the first version anchored on a bare
     * `backgroundColor: colors.primary` and a literal immediately after
     * `color=`, so it missed the tab bar's centre action button, which writes
     * both sides as ternaries. That site measured 2.04:1 in dark mode on the
     * most-tapped control in the app and was found by looking at the phone,
     * not by the scan.
     */
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const root = path.join(__dirname, '..');
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== 'node_modules' && e.name !== '__tests__') { walk(full); }
          continue;
        }
        if (!/\.tsx$/.test(e.name)) { continue; }
        const lines: string[] = fs.readFileSync(full, 'utf8').split('\n');
        lines.forEach((line: string, i: number) => {
          // Matches both the plain form and the conditional one:
          //   backgroundColor: colors.primary
          //   backgroundColor: focused ? colors.primary : colors.primaryLight
          // but NOT an alpha-blended tint (`colors.primary + '18'`), where the
          // foreground sits on a mostly-surface colour, not on primary itself.
          const bg = /backgroundColor:\s*[^,\n]*\bcolors\.(primary|accent)\b(?!\s*\+)/;
          if (!bg.test(line)) { return; }
          // Look a short way forward for a literal foreground in the same element.
          const window = lines.slice(i, i + 14).join('\n');
          // The literal may sit directly after `color=`/`color:` or inside a
          // ternary — `color={focused ? '#FFFFFF' : colors.primary}` is the
          // form that hid the tab-bar centre button from the first scanner.
          const fg = /\b(?:color|tintColor)(?:=|:)\s*\{?[^,;\n]*['"]#[0-9A-Fa-f]{3,8}['"]/;
          if (fg.test(window)) {
            offenders.push(`${path.relative(root, full)}:${i + 1}`);
          }
        });
      }
    };
    walk(root);

    expect(offenders).toEqual([]);
  });
});

// ── Perceptual distance (CIE Lab ΔE76) ─────────────────────────────────────
//
// Contrast ratio is a luminance measurement, so two colours can pass every
// contrast check against a shared background and still be indistinguishable
// to a reader. That is not hypothetical here: when the brand moved to green,
// the obvious `success` green sat ΔE 17 from the brand in light and ΔE 9 in
// dark — the same colour, at a perfectly healthy contrast ratio.

function lab(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const srgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const [r, g, b] = srgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** Below this two colours read as shades of one colour rather than two. */
const MIN_DISTINCT = 25;

describe('semantic colours are legible as text on their own tint', () => {
  // `Badge` renders `colors.success` as TEXT on `colors.successBg`, and the
  // same for warning/error/info. Under the rose palette four of these failed
  // AA in light mode — success was 2.97:1 — and shipped that way. They are
  // pinned here so the next palette change cannot quietly undo the fix.
  const tintPairs: Array<[keyof typeof lightColors, keyof typeof lightColors]> = [
    ['success', 'successBg'],
    ['warning', 'warningBg'],
    ['error', 'errorBg'],
    ['info', 'infoBg'],
    ['premium', 'premiumBg'],
  ];

  for (const [themeName, palette] of [['light', lightColors], ['dark', darkColors]] as const) {
    describe(themeName, () => {
      for (const [fg, bg] of tintPairs) {
        it(`${fg} on ${bg} meets AA`, () => {
          expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
        });
      }
    });
  }
});

describe('the brand green and the success green are never almost-the-same', () => {
  // Both are green. The dangerous state is not "identical" but "nearly
  // identical": two greens a few ΔE apart read as a mistake, while two that
  // match read as a decision. With the brand on the reference hue there is no
  // green left that reads as success AND clears ΔE 25 from it — established by
  // search over hues 60-140, where the only candidate was a dark olive that
  // reads as a warning. So success IS the brand green, deliberately.
  //
  // This asserts that choice rather than abandoning the guard: either exactly
  // equal, or properly distinct. The near-miss band is what fails.
  for (const [themeName, palette] of [['light', lightColors], ['dark', darkColors]] as const) {
    it(`${themeName}: success either matches the brand exactly or differs clearly`, () => {
      const d = deltaE(palette.primary, palette.success);
      const verdict = d === 0 || d >= MIN_DISTINCT;
      expect({ themeName, deltaE: Math.round(d), verdict })
        .toEqual({ themeName, deltaE: Math.round(d), verdict: true });
    });
  }

  it('keeps the brand clearly apart from the colours that must NOT be confused with it', () => {
    // Success may share the brand's colour because a check glyph and its label
    // carry the meaning. Warning and error may not: those are the states a
    // user must recognise instantly and never mistake for a brand accent.
    for (const [themeName, palette] of [['light', lightColors], ['dark', darkColors]] as const) {
      for (const token of ['warning', 'error', 'accent'] as const) {
        const d = deltaE(palette.primary, palette[token]);
        expect({ themeName, token, distinct: d >= MIN_DISTINCT })
          .toEqual({ themeName, token, distinct: true });
      }
    }
  });

  it('does not collide with the cycle-phase data language either', () => {
    // The phase colours are a separate vocabulary and were deliberately left
    // alone when the brand changed; the brand must not read as a fifth phase.
    for (const [themeName, palette] of [['light', lightColors], ['dark', darkColors]] as const) {
      for (const phase of ['menstrual', 'follicular', 'ovulation', 'luteal'] as const) {
        const d = deltaE(palette.primary, palette[phase]);
        expect({ themeName, phase, d: d >= MIN_DISTINCT }).toEqual({ themeName, phase, d: true });
      }
    }
  });
});

describe('the hero gradient carries its own text', () => {
  // The greeting sits across the whole ramp, not just the dark end. The rose
  // gradient's light stop measured 3.35:1 against it and failed AA.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getBrandGradient } = require('@theme/brand');

  for (const [themeName, palette, isDark] of
       [['light', lightColors, false], ['dark', darkColors, true]] as const) {
    it(`${themeName}: textOnDark meets AA at both stops`, () => {
      const g = getBrandGradient(isDark);
      expect(contrast(palette.textOnDark, g.heroFrom)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      expect(contrast(palette.textOnDark, g.heroTo)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });
  }
});

// ── Design-system structure ────────────────────────────────────────────────
//
// These pin the SHAPE of the system rather than any particular value. Each one
// corresponds to a way the system had already come apart:
//
//   * `borderRadius` and the shadow presets were declared twice — in
//     `theme/colors.ts` and in `theme/spacing.ts`. Nothing imported the
//     colors.ts copy, so it drifted unnoticed: its shadow opacities had
//     reached 0.06–0.14 against the live 0.03–0.06.
//   * Radius had sixteen keys for eight values, so two components could pick
//     the same corner through different names.
//   * Type had three vocabularies and fourteen distinct sizes, two of which
//     (16 and 10) existed only inside `textRoles`.
//   * Every shadow hard-coded a blue-grey `#111827`, ignoring the palette's
//     own shadow token and emitting the same invisible 4% shadow on a
//     near-black surface as on a white one.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodeFs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodePath = require('path');

const THEME_DIR = nodePath.join(__dirname, '..', 'theme');

describe('each scale has exactly one home', () => {
  it('does not redeclare radius or elevation in the palette file', () => {
    const colorsSrc: string = nodeFs.readFileSync(nodePath.join(THEME_DIR, 'colors.ts'), 'utf8');
    expect(colorsSrc).not.toMatch(/const\s+borderRadius\s*=/);
    expect(colorsSrc).not.toMatch(/const\s+shadows?\s*=\s*\{/);
  });

  it('builds elevation from the palette rather than a literal colour', () => {
    const spacingSrc: string = nodeFs.readFileSync(nodePath.join(THEME_DIR, 'spacing.ts'), 'utf8');
    // Strip comments first: the note explaining why the old literal was wrong
    // quotes that literal, and matching prose would fail on the explanation
    // rather than on the code.
    const code = spacingSrc
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    // A hex here would mean a shadow that cannot follow the theme.
    expect(code.match(/shadowColor:\s*'#[0-9A-Fa-f]{3,8}'/g)).toBeNull();
  });
});

describe('corner radius has one name per value', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { borderRadius } = require('@theme/spacing');

  it('contains no duplicate radii', () => {
    const byValue = new Map<number, string[]>();
    for (const [name, value] of Object.entries(borderRadius) as Array<[string, number]>) {
      byValue.set(value, [...(byValue.get(value) ?? []), name]);
    }
    const duplicates = [...byValue.entries()]
      .filter(([, names]) => names.length > 1)
      .map(([value, names]) => `${value}: ${names.join(', ')}`);
    expect(duplicates).toEqual([]);
  });
});

describe('type is one ladder, not three vocabularies', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { STEP, typography: type, textRoles: roles } = require('@theme/typography');
  const ladder: number[] = Object.values(STEP);

  it('defines every size in STEP', () => {
    expect(ladder.length).toBeGreaterThan(0);
    expect(new Set(ladder).size).toBe(ladder.length);
  });

  it('never lets the numeric or semantic scale invent a size', () => {
    const sizeKeys = Object.entries(type as Record<string, unknown>)
      .filter(([k, v]) => typeof v === 'number' && !k.startsWith('lineHeight') && !k.startsWith('tracking'));
    const offLadder = sizeKeys
      .filter(([, v]) => !ladder.includes(v as number))
      .map(([k, v]) => `${k}=${v}`);
    expect(offLadder).toEqual([]);
  });

  it('never lets a text role invent a size', () => {
    // `textRoles` is exactly how 16 and 10 entered the system unannounced.
    const offLadder = Object.entries(roles as Record<string, { fontSize: number }>)
      .filter(([, r]) => !ladder.includes(r.fontSize))
      .map(([k, r]) => `${k}=${r.fontSize}`);
    expect(offLadder).toEqual([]);
  });

  it('names the size the app actually uses most', () => {
    // `typography.sm` (14) has ~123 call sites; before this it had no role.
    const sizes = Object.values(roles as Record<string, { fontSize: number }>).map((r) => r.fontSize);
    expect(sizes).toContain(STEP.compact);
  });
});

describe('elevation follows the theme', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { buildShadows } = require('@theme/spacing');

  const light = buildShadows(lightColors.shadow, false);
  const dark = buildShadows(darkColors.shadow, true);

  it('takes its colour from the palette', () => {
    expect(light.md.shadowColor).toBe(lightColors.shadow);
    expect(dark.md.shadowColor).toBe(darkColors.shadow);
  });

  it('is emitted more strongly on dark surfaces, where a faint shadow vanishes', () => {
    for (const step of ['xs', 'sm', 'md', 'lg'] as const) {
      expect(dark[step].shadowOpacity).toBeGreaterThan(light[step].shadowOpacity);
    }
  });

  it('keeps each step at the same height in both themes', () => {
    // Only opacity may differ; if height changed, an element would appear to
    // rise or settle purely because the user switched theme.
    for (const step of ['xs', 'sm', 'md', 'lg'] as const) {
      expect(dark[step].shadowOffset).toEqual(light[step].shadowOffset);
      expect(dark[step].shadowRadius).toBe(light[step].shadowRadius);
      expect(dark[step].elevation).toBe(light[step].elevation);
    }
  });

  it('rises monotonically', () => {
    const ladder = ['xs', 'sm', 'md', 'lg'] as const;
    for (let i = 1; i < ladder.length; i++) {
      expect(light[ladder[i]].elevation).toBeGreaterThan(light[ladder[i - 1]].elevation);
      expect(light[ladder[i]].shadowRadius).toBeGreaterThan(light[ladder[i - 1]].shadowRadius);
    }
  });

  it('casts the modal shadow upward, since a sheet lifts from the bottom edge', () => {
    expect(light.modal.shadowOffset.height).toBeLessThan(0);
  });
});

describe('components take their colours from the theme', () => {
  // Three components carried private Tailwind palettes — `Toast`,
  // `ConfirmSheet` and `GradientBackground`. Each produced the same two
  // faults: a semantic colour that did not match the app's own (a success
  // toast was a different green from a success badge), and a surface that
  // ignored dark mode entirely, painting a near-white panel behind
  // dark-mode content.
  //
  // A fourth, `WellnessRing`, held sixteen such literals and had no call
  // sites at all; it was deleted rather than converted.

  const TOKEN_DRIVEN = [
    'components/ui/Toast.tsx',
    'components/ui/ConfirmSheet.tsx',
    'components/ui/GradientBackground.tsx',
  ];

  /** Colour literals in code, ignoring comments that discuss them. */
  function colourLiterals(relPath: string): string[] {
    const full = nodePath.join(__dirname, '..', relPath);
    const src: string = nodeFs.readFileSync(full, 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    return code.match(/'#[0-9A-Fa-f]{3,8}'/g) ?? [];
  }

  for (const rel of TOKEN_DRIVEN) {
    it(`${rel} defines no palette of its own`, () => {
      // A lone '#000' shadow is tolerated; a palette is not.
      const literals = colourLiterals(rel).filter((c) => !/^'#(0{3,8}|f{3,8}|F{3,8})'$/.test(c));
      expect(literals).toEqual([]);
    });
  }

  it('no longer ships the unused ring component', () => {
    expect(nodeFs.existsSync(nodePath.join(__dirname, '..', 'components/ui/WellnessRing.tsx')))
      .toBe(false);
  });
});
