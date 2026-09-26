/**
 * Today 2.1 Phase A / Decision 5 — config.ts local-backend-override
 * regression guard.
 *
 * `LOCAL_BACKEND_OVERRIDE` (src/constants/config.ts) exists only so a
 * developer can point a debug build at a local backend during device
 * verification without hand-editing DEV_API_URL's string value directly
 * (the friction flagged in docs/features/today-2.0.md and locked as
 * Decision 5 in docs/features/today-2.1-design.md). This test's only job
 * is to fail CI if that override is ever left set in committed source —
 * reading the file's own source text directly (not importing it) is
 * deliberate: __DEV__ is true under Jest, so importing the module would
 * always report the *overridden* value if one were set, which is exactly
 * the state this test needs to be able to detect and fail on.
 */
// An `export` (even an empty one) makes this a proper ES module with its
// own scope — without one, a `require`-only file with no import/export
// is treated as a global script by TS, and its top-level `const`s collide
// with same-named ones in other script-scoped test files (e.g.
// contextEntryContract.test.ts's own `const fs`/`const path`).
export {};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

const CONFIG_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../constants/config.ts'),
  'utf8',
);

describe('config.ts local-backend override', () => {
  it('is null in committed source (never left pointed at a local backend)', () => {
    const match = CONFIG_SOURCE.match(
      /const LOCAL_BACKEND_OVERRIDE:\s*string \| null\s*=\s*([^;]+);/,
    );
    expect(match).not.toBeNull();
    expect(match![1].trim()).toBe('null');
  });

  it('PROD_API_URL is the real production URL and is never derived from the override', () => {
    expect(CONFIG_SOURCE).toContain("const PROD_API_URL = 'https://api.rithmo.ir';");
    // The override must only ever feed DEV_API_URL, never PROD_API_URL —
    // a release build (__DEV__ === false) must be unaffected by it no
    // matter what a developer temporarily sets it to locally.
    const prodLine = CONFIG_SOURCE
      .split('\n')
      .find((line: string) => line.trim().startsWith('const PROD_API_URL'));
    expect(prodLine).toBeDefined();
    expect(prodLine).not.toContain('LOCAL_BACKEND_OVERRIDE');
  });
});
