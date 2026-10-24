/**
 * Visual and motion system: what must stay true as screens adopt it.
 * (No render tests exist in this app, so the rules are pinned on the source
 * plus the pure functions behind the visuals.)
 */
declare const __dirname: string;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

import { stripFraction, stripLabel } from '../components/viz/cycleDayStripLogic';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]): string => fs.readFileSync(path.join(SRC, ...p), 'utf8');
const NEW_VISUAL_FILES = [
  ['components', 'illustrations', 'index.tsx'],
  ['components', 'ui', 'Collapsible.tsx'],
  ['components', 'viz', 'CycleDayStrip.tsx'],
];

describe('cycle day strip', () => {
  it('is today over the average length, capped at a full bar, and empty without both numbers', () => {
    expect(stripFraction(7, 28)).toBeCloseTo(0.25);
    expect(stripFraction(40, 28)).toBe(1);
    expect(stripFraction(0, 28)).toBe(0);
    expect(stripFraction(5, 0)).toBe(0);
    expect(stripFraction(Number.NaN, 28)).toBe(0);
  });

  it('words it as a position in the average, never as a date or a prediction', () => {
    const label = stripLabel(7, 28);
    expect(label).toContain('میانگین');
    expect(label).not.toMatch(/تخمک|باروری|پیش‌بینی|دوره‌ی بعدی/);
  });

  it('is exposed to screen readers as a progress value', () => {
    const src = read('components', 'viz', 'CycleDayStrip.tsx');
    expect(src).toMatch(/accessibilityRole="progressbar"/);
    expect(src).toMatch(/accessibilityValue=\{\{ min: 0, max: length/);
  });

  it('is used on the cycle screen with recorded numbers only, and only when both exist', () => {
    const src = read('screens', 'cycle', 'CycleAnalysisScreen.tsx');
    expect(src).toMatch(/<CycleDayStrip day=\{cycleDay\} length=\{avgCycle\}/);
    expect(src).toMatch(/typeof cycleDay === 'number' && typeof avgCycle === 'number'/);
  });

  it('renders nothing for insufficient data (the component returns null at zero)', () => {
    expect(read('components', 'viz', 'CycleDayStrip.tsx')).toMatch(/if \(frac === 0\) \{ return null; \}/);
  });
});

describe('motion rules for the new components', () => {
  it('never loops, and never reaches for a new animation dependency', () => {
    for (const f of NEW_VISUAL_FILES) {
      const src = read(...f);
      expect(src).not.toMatch(/Animated\.loop|repeat:|setInterval/);
      expect(src).not.toMatch(/from 'react-native-reanimated'|from 'lottie/);
    }
  });

  it('stands still under reduced motion', () => {
    expect(read('components', 'ui', 'Collapsible.tsx')).toMatch(/useReducedMotion/);
    expect(read('components', 'viz', 'CycleDayStrip.tsx')).toMatch(/useReducedMotion/);
    // The illustration entrance is the shared Reveal, which already honours it.
    expect(read('components', 'illustrations', 'index.tsx')).toMatch(/Reveal/);
    expect(read('components', 'ui', 'Reveal.tsx')).toMatch(/isReduceMotionEnabled/);
  });

  it('keeps animations short', () => {
    const strip = read('components', 'viz', 'CycleDayStrip.tsx');
    const m = strip.match(/duration: (\d+)/);
    expect(m && Number(m[1])).toBeLessThanOrEqual(600);
    expect(read('components', 'ui', 'Collapsible.tsx')).toMatch(/LayoutAnimation\.create\(200,/);
  });

  it('announces collapsible state to assistive technology', () => {
    expect(read('components', 'ui', 'Collapsible.tsx')).toMatch(/accessibilityState=\{\{ expanded: open \}\}/);
  });
});

describe('reduced motion is honoured by every animated primitive in the system', () => {
  const PRIMITIVES = [
    ['components', 'ui', 'PressScale.tsx'],
    ['components', 'ui', 'Reveal.tsx'],
    ['components', 'ui', 'Collapsible.tsx'],
    ['components', 'viz', 'CycleDayStrip.tsx'],
  ];

  it('each one that animates consults the shared preference, never a private one', () => {
    for (const f of PRIMITIVES) {
      const src = read(...f);
      expect(/Animated\.timing|LayoutAnimation\.configureNext/.test(src)).toBe(true);
      expect(/useReducedMotion|isReduceMotionEnabled/.test(src)).toBe(true);
      expect(src).not.toMatch(/AsyncStorage|reduceMotionSetting|motionEnabled/);
    }
  });

  it('press feedback skips the scale under reduced motion and stops on unmount', () => {
    const src = read('components', 'ui', 'PressScale.tsx');
    expect(src).toMatch(/if \(reduced\) \{ scale\.setValue\(1\); return; \}/);
    expect(src).toMatch(/scale\.stopAnimation\(\)/);
  });

  it('the strip jumps straight to its end value, and stops its animation on unmount', () => {
    const src = read('components', 'viz', 'CycleDayStrip.tsx');
    expect(src).toMatch(/if \(reduced\) \{ p\.setValue\(frac\); return undefined; \}/);
    expect(src).toMatch(/return \(\) => anim\.stop\(\)/);
  });

  it('Reveal stops its animation on unmount and never hides content while the preference loads', () => {
    const src = read('components', 'ui', 'Reveal.tsx');
    expect(src).toMatch(/anim\.stop\(\)/);
    expect(src).toMatch(/never hide the content/);
  });

  it('does not use the native driver for layout props (width) that cannot take it', () => {
    expect(read('components', 'viz', 'CycleDayStrip.tsx')).toMatch(/useNativeDriver: false/);
  });
});

describe('illustrations', () => {
  const src = read('components', 'illustrations', 'index.tsx');

  it('are decorative, drawn in code from theme colours, with no bundled or remote image', () => {
    expect(src).toMatch(/importantForAccessibility="no-hide-descendants"/);
    expect(src).not.toMatch(/require\(|https?:\/\/|uri:|<Image/);
    expect(src).toMatch(/useTheme/);
  });

  it('carry no hard-coded colour', () => {
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('add no binary asset to the app', () => {
    const dir = fs.readdirSync(path.join(SRC, 'components', 'illustrations'));
    expect(dir).toEqual(['index.tsx']);
  });

  it('use neutral motifs: no shield, tick or body imagery that could imply protection or a result', () => {
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/shield|check|tick/i);
  });
});

describe('where it is applied', () => {
  it('gives the Health hub press feedback and a staged entrance', () => {
    const hub = read('screens', 'healthGuide', 'HealthGuideHubScreen.tsx');
    expect(hub).toMatch(/PressScale/);
    expect(hub.match(/<Reveal/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps the urgent help outside any collapsed or lazily shown container', () => {
    const hub = read('screens', 'healthGuide', 'HealthGuideHubScreen.tsx');
    expect(hub).not.toMatch(/Collapsible/);
  });

  it('collapses only the contraception history, not records the user acts on', () => {
    const mc = read('screens', 'healthGuide', 'MyContraceptionScreen.tsx');
    expect(mc.match(/<Collapsible/g)?.length).toBe(1);
    expect(mc).toMatch(/Collapsible title="سابقه‌ی روش‌ها"/);
  });
});
