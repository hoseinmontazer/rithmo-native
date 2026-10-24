/**
 * Home's quick check-in chips: every chip opens a section QuickLog really has,
 * and QuickLog actually honours which one. Water and Weight were removed
 * because QuickLog has no such input; `initialCategory` used to be sent and
 * never read.
 */
declare const __dirname: string;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

import {
  QUICK_LOG_FOCUS_OFFSET, QUICK_LOG_FOCUS_SECTIONS, focusScrollY, parseQuickLogFocus,
} from '../screens/wellness/quickLogFocus';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]): string => fs.readFileSync(path.join(SRC, ...p), 'utf8');
const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const widget = stripComments(read('screens', 'home', 'components', 'QuickCheckInWidget.tsx'));
const quickLog = read('screens', 'wellness', 'QuickLogScreen.tsx');
const home = read('screens', 'home', 'HomeScreen.tsx');
const navTypes = read('navigation', 'types.ts');

describe('the focus contract', () => {
  it('names exactly the three sections QuickLog can open at', () => {
    expect([...QUICK_LOG_FOCUS_SECTIONS]).toEqual(['mood', 'energy', 'symptoms']);
  });

  it('accepts those names and rejects everything else, including the removed chips', () => {
    for (const ok of QUICK_LOG_FOCUS_SECTIONS) { expect(parseQuickLogFocus(ok)).toBe(ok); }
    for (const bad of ['Water', 'Weight', 'water', 'weight', 'Mood', 'sleep', '', undefined, null, 3, {}]) {
      expect(parseQuickLogFocus(bad)).toBeNull();
    }
  });

  it('scrolls to a section with a little room above it and never above the top', () => {
    expect(focusScrollY(0)).toBe(0);
    expect(focusScrollY(3)).toBe(0);
    expect(focusScrollY(400)).toBe(400 - QUICK_LOG_FOCUS_OFFSET);
    expect(focusScrollY(400.6)).toBe(Math.round(400.6) - QUICK_LOG_FOCUS_OFFSET);
  });
});

describe('the Home widget', () => {
  const focuses = [...widget.matchAll(/\{ focus: '([a-z]+)'/g)].map((m) => m[1]);

  it('offers exactly Mood, Energy and Symptoms', () => {
    expect(focuses).toEqual(['mood', 'energy', 'symptoms']);
    for (const f of ['حالت', 'انرژی', 'نشانه‌ها']) { expect(widget).toContain(`'${f}'`); }
  });

  it('every chip names a section QuickLog supports', () => {
    for (const f of focuses) { expect(QUICK_LOG_FOCUS_SECTIONS).toContain(f); }
  });

  it('no longer offers Water or Weight', () => {
    // \b keeps `fontWeight` from counting as a Weight chip.
    expect(widget).not.toMatch(/quickWater|\bWater\b|\bWeight\b|'water'|'weight'|وزن|'آب'/i);
    expect(widget).not.toMatch(/lucide-react-native/);
  });

  it('is still rendered by Home with the same handler', () => {
    expect(home).toMatch(/<QuickCheckInWidget onPressItem=\{goToQuickLogCategory\} \/>/);
    expect(home).toMatch(/params: \{ initialCategory: focus \}/);
  });
});

describe('QuickLog honours the focus', () => {
  it('has a real section for every focus the widget can send', () => {
    expect(quickLog).toContain('{QUICK_LOG_MOOD_HEADING}'); // mood (top of the form)
    expect(read('screens', 'wellness', 'quickLogLabels.ts')).toContain("QUICK_LOG_MOOD_HEADING = 'حال‌وهوا'");
    expect(quickLog).toContain('label="انرژی"');        // energy
    expect(quickLog).toContain('علائم شایع امروز');     // symptoms
  });

  it('reads the parameter through the validator, never the raw value', () => {
    expect(quickLog).toMatch(/parseQuickLogFocus\(route\.params\?\.initialCategory\)/);
  });

  it('scrolls to the energy and symptoms sections once they are laid out', () => {
    expect(quickLog).toMatch(/noteSection\('energy', e\.nativeEvent\.layout\.y\)/);
    expect(quickLog).toMatch(/noteSection\('symptoms', e\.nativeEvent\.layout\.y\)/);
    expect(quickLog).toMatch(/scrollRef\.current\?\.scrollTo\(\{ y: focusScrollY\(y\), animated: false \}\)/);
    expect(quickLog).toMatch(/ref=\{scrollRef\}/);
  });

  it('consumes the hint so a later open is not scrolled by a stale value', () => {
    expect(quickLog).toMatch(/navigation\.setParams\(\{ initialCategory: undefined \}\)/);
  });

  it('does not touch the save/update path', () => {
    expect(quickLog).toMatch(/useCreateOrUpdateWellnessLog\(\)/);
    expect(stripComments(quickLog)).not.toMatch(/water_intake|\bweight\b|weight_kg|body_weight/i);
  });

  it('types the parameter on the route', () => {
    expect(navTypes).toMatch(/QuickLog:\s+\{ logId\?: number; initialCategory\?: QuickLogFocus \}/);
  });
});
