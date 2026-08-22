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
        src.split('\n').forEach((line: string, i: number) => {
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
