/**
 * Every content page sits in the same frame.
 *
 * Audited across 27 screens: the horizontal gutter was spacing[4], [5] or [6]
 * depending on the file, the top inset was one of 64/32/28/16/12/8 or missing
 * entirely on seven screens, and the bottom inset had six values. Each page
 * looked fine in isolation; moving between them read as sloppiness, because
 * content sat a different distance from the edge on almost every one.
 *
 * `theme/spacing.ts` → `screen` is now the single source for that frame, and
 * this test stops a screen from going back to a hand-picked number.
 */
export {};

declare const __dirname: string;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

const SCREENS = path.join(__dirname, '..', 'screens');

/**
 * Centred hero layouts, not content pages: their larger top inset is doing
 * vertical composition. ConversationScreen is a chat transcript, which is
 * pinned to its own edges.
 */
const EXEMPT = [
  path.join('auth', ''),
  path.join('onboarding', ''),
  path.join('messages', 'ConversationScreen.tsx'),
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { out.push(...walk(full)); }
    else if (e.name.endsWith('.tsx')) { out.push(full); }
  }
  return out;
}

const pages = walk(SCREENS)
  .map((f: string) => ({ file: path.relative(SCREENS, f), text: fs.readFileSync(f, 'utf8') as string }))
  .filter((p: { text: string }) => p.text.includes('contentContainerStyle'))
  .filter((p: { file: string }) => !EXEMPT.some((e) => p.file.startsWith(e)))
  // A screen's own `components/` folder holds reusable pieces embedded
  // INSIDE a page's frame (e.g. a small horizontal ScrollView with its own
  // deliberate inset), not a second content page. `contentContainerStyle`
  // is not unique to page-level ScrollViews, so without this a nested
  // component picks up the same match this test uses to find real pages.
  .filter((p: { file: string }) => !p.file.split(path.sep).includes('components'));

describe('every content page uses the shared screen frame', () => {
  it('found pages to check', () => {
    // Guards the walker: an empty list would make the assertions vacuous.
    expect(pages.length).toBeGreaterThan(15);
  });

  for (const { file, text } of pages) {
    it(`${file} takes its gutter from the token`, () => {
      expect(text).toMatch(/paddingHorizontal:\s*screen\.gutter/);
    });

    it(`${file} sets a top inset from the token`, () => {
      expect(text).toMatch(/paddingTop:\s*screen\.top/);
    });
  }

  it('no content page hand-picks a scroll-container padding', () => {
    const offenders: string[] = [];
    for (const { file, text } of pages) {
      const m = text.match(/contentContainerStyle=\{[\s\S]{0,400}?\}\}/);
      if (!m) { continue; }
      // A raw number or a bare spacing[n] for a page-edge inset is the drift
      // this test exists to catch.
      if (/padding(Horizontal|Top|Bottom)?:\s*(spacing\[\d+\]|\d+)/.test(m[0])) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});
