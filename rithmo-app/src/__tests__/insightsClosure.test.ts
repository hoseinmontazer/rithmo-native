/**
 * Closure-pass display fixes: regularity is already a percent, Quick Log uses
 * the product's «حال‌وهوا», and the Insights screens speak with «تو».
 */
import { regularityBand, regularityPercent } from '../utils/regularity';
import { QUICK_LOG_MOOD_HEADING } from '../screens/wellness/quickLogLabels';
import { buildTodayRecorded } from '../screens/home/todayRecorded';

// The project has no Node typings (tsc would flag `import 'fs'`); these tests
// read source text, so reach Node's modules through an untyped require.
declare const require: (id: string) => any;
const fs = require('fs') as { readFileSync(file: string, encoding: string): string };
const path = require('path') as { join(...parts: string[]): string };

const src = (...p: string[]) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');

describe('regularityPercent (backend sends 0-100, not 0-1)', () => {
  it.each([
    [0, 0],
    [42.6, 43],
    [75, 75],
    [92, 92],
    [100, 100],
  ])('%p shows as %p%%, never multiplied again', (score, shown) => {
    expect(regularityPercent(score)).toBe(shown);
  });

  it('is empty when there is no score and clamps stray values', () => {
    expect(regularityPercent(null)).toBeNull();
    expect(regularityPercent(undefined)).toBeNull();
    expect(regularityPercent(Number.NaN)).toBeNull();
    expect(regularityPercent(-5)).toBe(0);
    expect(regularityPercent(140)).toBe(100);
  });

  it('bands on the same 50 / 75 cut-offs the tile always used', () => {
    expect(regularityBand(100)).toBe('good');
    expect(regularityBand(76)).toBe('good');
    expect(regularityBand(75)).toBe('fair');
    expect(regularityBand(51)).toBe('fair');
    expect(regularityBand(50)).toBe('low');
    expect(regularityBand(0)).toBe('low');
  });

  it('the Insights tile uses it instead of multiplying by 100', () => {
    const tile = src('screens', 'insights', 'InsightsHomeScreen.tsx');
    expect(tile).toContain('regularityPercent(cd?.regularity_score)');
    expect(tile).not.toMatch(/regScore\s*\*\s*100/);
  });
});

describe('vocabulary and register', () => {
  it('Quick Log names the mood section like the rest of the product', () => {
    expect(QUICK_LOG_MOOD_HEADING).toBe('حال‌وهوا');
    const recorded = buildTodayRecorded({ mood: 3 }, []);
    expect(recorded.find((i) => i.key === 'mood')?.label).toBe(QUICK_LOG_MOOD_HEADING);
    expect(src('screens', 'wellness', 'QuickLogScreen.tsx')).toContain('{QUICK_LOG_MOOD_HEADING}');
  });

  it('the Insights screens no longer say formal «شما»', () => {
    for (const file of [
      ['screens', 'insights', 'InsightsHomeScreen.tsx'],
      ['screens', 'insights', 'components', 'HealthChangeCard.tsx'],
    ]) {
      const code = src(...file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(code).not.toMatch(/\bشما\b/);
    }
  });
});
