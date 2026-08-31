/**
 * Typography and iconography contracts (F-07).
 *
 * Two systems are pinned here, and both have a specific way of failing badly:
 *
 *  * **The font.** It is applied by patching `Text.render` once, rather than by
 *    editing ~700 style blocks. That is the small, safe change *only* as long
 *    as it never overwrites a style that already names a family — because every
 *    vector icon is a `<Text>` whose family is `MaterialCommunityIcons` and
 *    whose content is a private-use codepoint. Get that predicate wrong and all
 *    82 icon usages become missing-glyph boxes at once. It is one line of
 *    logic guarding the entire icon set, so it is tested directly.
 *
 *  * **The icon names.** A MaterialCommunityIcons name that does not exist does
 *    not throw; it renders a blank or a tofu box. F-03 shipped `pill-off` that
 *    way. So every name the app can ask for is checked against the glyphmap
 *    that actually ships in `node_modules`, not against a list I typed.
 */

declare const __dirname: string;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

import {
  WEIGHT_TO_FAMILY,
  BUNDLED_FACES,
  DEFAULT_FACE,
  fontFamilyForWeight,
} from '@theme/fonts';
import { textRoles } from '@theme/typography';
import { resolveFontFamily } from '@theme/applyGlobalFont';
import {
  MOOD_ICONS,
  MOOD_FALLBACK_ICON,
  moodIcon,
  DOMAIN_ICONS,
  ACTION_ICONS,
  SYMPTOM_ICONS,
  SYMPTOM_FALLBACK_ICON,
  TAB_ICONS,
  shouldFlipForRTL,
} from '@design-system/iconography';

const APP_ROOT = path.join(__dirname, '..', '..');
const FONT_DIR = path.join(APP_ROOT, 'android', 'app', 'src', 'main', 'assets', 'fonts');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const GLYPHS: Record<string, number> = require(
  path.join(APP_ROOT, 'node_modules', 'react-native-vector-icons', 'glyphmaps', 'MaterialCommunityIcons.json'),
);

describe('the Persian font actually ships', () => {
  it('bundles a .ttf for every face the weight map can return', () => {
    const missing = BUNDLED_FACES.filter(
      (face) => !fs.existsSync(path.join(FONT_DIR, `${face}.ttf`)),
    );
    expect(missing).toEqual([]);
  });

  it('never maps a weight to a face that is not bundled', () => {
    // A weight pointing at an absent file is the silent failure mode: Android
    // falls back to the system face and the text simply stops being Vazirmatn.
    const dangling = Object.entries(WEIGHT_TO_FAMILY).filter(
      ([, face]) => !(BUNDLED_FACES as readonly string[]).includes(face),
    );
    expect(dangling).toEqual([]);
  });

  it('ships the OFL licence alongside the fonts', () => {
    // OFL 1.1 permits embedding, and requires the licence to travel with the
    // font. Shipping the files without it would be the one licensing mistake
    // that is entirely ours to avoid.
    const licence = path.join(APP_ROOT, 'src', 'assets', 'fonts', 'Shabnam-OFL.txt');
    expect(fs.existsSync(licence)).toBe(true);
    expect(fs.readFileSync(licence, 'utf8')).toMatch(/Open Font License/i);
  });

  it('covers every weight the app actually declares', () => {
    // Measured across src/: 400, 500, 600, 700, 800, 900 and the legacy 'bold'.
    for (const w of ['400', '500', '600', '700', '800', '900', 'bold', 'normal']) {
      expect(WEIGHT_TO_FAMILY[w]).toBeDefined();
    }
  });

  it('falls back to regular rather than to nothing', () => {
    expect(fontFamilyForWeight(undefined)).toBe(DEFAULT_FACE);
    expect(fontFamilyForWeight('not-a-weight')).toBe(DEFAULT_FACE);
    expect(fontFamilyForWeight('600')).toBe('Shabnam-Medium');
  });
});

describe('the global font patch leaves icon fonts alone', () => {
  it('does NOT touch a style that already names a family', () => {
    // This is the icon set's only protection. If it ever returns a family
    // here, every MaterialCommunityIcons glyph renders as a box.
    expect(resolveFontFamily({ fontFamily: 'MaterialCommunityIcons' })).toBeNull();
    expect(resolveFontFamily([{ fontSize: 12 }, { fontFamily: 'MaterialCommunityIcons' }])).toBeNull();
  });

  it('applies the Persian face to ordinary text', () => {
    expect(resolveFontFamily(undefined)).toBe(DEFAULT_FACE);
    expect(resolveFontFamily({ fontSize: 15 })).toBe(DEFAULT_FACE);
  });

  it('picks the face that matches the caller\'s weight', () => {
    // Android will not synthesise these; asking for the file is the only way
    // a 500 and a 700 look different.
    expect(resolveFontFamily({ fontWeight: '500' })).toBe('Shabnam-Medium');
    expect(resolveFontFamily({ fontWeight: '600' })).toBe('Shabnam-Medium');
    expect(resolveFontFamily({ fontWeight: '700' })).toBe('Shabnam-Bold');
    expect(resolveFontFamily({ fontWeight: '800' })).toBe('Shabnam-Bold');
  });
});

describe('semantic type roles', () => {
  it('every role defines size, weight and an absolute line height', () => {
    for (const [name, role] of Object.entries(textRoles)) {
      expect(typeof role.fontSize).toBe('number');
      expect(typeof role.fontWeight).toBe('string');
      expect(typeof role.lineHeight).toBe('number');
      // Persian ascenders/descenders clip under a tight line height; every
      // role must leave real room, not just 1.0×.
      expect(role.lineHeight).toBeGreaterThan(role.fontSize * 1.15);
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it('every role weight is one the font can actually render', () => {
    const unrenderable = Object.entries(textRoles).filter(
      ([, r]) => !WEIGHT_TO_FAMILY[r.fontWeight],
    );
    expect(unrenderable).toEqual([]);
  });

  it('keeps a real hierarchy — display is larger than body is larger than caption', () => {
    expect(textRoles.display.fontSize).toBeGreaterThan(textRoles.sectionTitle.fontSize);
    expect(textRoles.sectionTitle.fontSize).toBeGreaterThan(textRoles.body.fontSize);
    expect(textRoles.body.fontSize).toBeGreaterThan(textRoles.caption.fontSize);
    expect(textRoles.caption.fontSize).toBeGreaterThan(textRoles.tabLabel.fontSize);
  });
});

describe('every icon name the app can ask for exists', () => {
  const allNames = [
    ...Object.values(MOOD_ICONS),
    MOOD_FALLBACK_ICON,
    ...Object.values(DOMAIN_ICONS),
    ...Object.values(ACTION_ICONS),
    ...Object.values(SYMPTOM_ICONS),
    SYMPTOM_FALLBACK_ICON,
    ...Object.values(TAB_ICONS),
  ];

  it('resolves in the shipped MaterialCommunityIcons glyphmap', () => {
    const invalid = allNames.filter((n) => !(n in GLYPHS));
    expect(invalid).toEqual([]);
  });

  it('has no empty or whitespace names', () => {
    expect(allNames.filter((n) => !n || !n.trim())).toEqual([]);
  });
});

describe('mood is an icon scale, not emoji', () => {
  it('maps all five levels', () => {
    for (let level = 1; level <= 5; level++) {
      expect(MOOD_ICONS[level]).toBeDefined();
    }
  });

  it('gives each level a distinct glyph, so the row reads as a scale', () => {
    const glyphs = Object.values(MOOD_ICONS);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });

  it('falls back neutrally for a level outside the scale', () => {
    expect(moodIcon(0)).toBe(MOOD_FALLBACK_ICON);
    expect(moodIcon(99)).toBe(MOOD_FALLBACK_ICON);
    expect(moodIcon(3)).toBe(MOOD_ICONS[3]);
  });
});

describe('directional icons are mirrored under RTL', () => {
  it('flips send, because a send arrow follows the reading direction', () => {
    expect(shouldFlipForRTL(ACTION_ICONS.send)).toBe(true);
  });

  it('does not flip icons whose meaning is direction-free', () => {
    expect(shouldFlipForRTL(DOMAIN_ICONS.medication)).toBe(false);
    expect(shouldFlipForRTL(ACTION_ICONS.messages)).toBe(false);
  });
});

describe('no raw emoji survives as a primary functional icon', () => {
  // Scoped to the surfaces migrated in F-07. A blanket ban would fail on
  // `components/ui/Icon.tsx`, whose emoji are a *fallback* for an unlinked
  // native module and never render while vector-icons is present, and on
  // decorative copy where an emoji is legitimately part of the sentence.
  const MIGRATED = [
    'screens/messages/ConversationScreen.tsx',
    'screens/messages/MessagesListScreen.tsx',
    'screens/wellness/QuickLogScreen.tsx',
    'screens/wellness/WellnessDashboardScreen.tsx',
    'screens/notifications/NotificationsScreen.tsx',
  ];

  // Pictographs and dingbats: the ranges an emoji-as-icon comes from.
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

  it('renders no emoji in the migrated surfaces', () => {
    const offenders: string[] = [];
    for (const rel of MIGRATED) {
      const full = path.join(APP_ROOT, 'src', rel);
      const lines: string[] = fs.readFileSync(full, 'utf8').split('\n');
      lines.forEach((line: string, i: number) => {
        if (EMOJI.test(line)) {
          offenders.push(`${rel}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('the send control uses the icon family, not a text arrow', () => {
    const src = fs.readFileSync(
      path.join(APP_ROOT, 'src', 'screens', 'messages', 'ConversationScreen.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/➤/);
    expect(src).toContain('ACTION_ICONS.send');
  });
});
