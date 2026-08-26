/**
 * The navigation graph as a contract (F-06).
 *
 * These tests read the navigator sources and assert the shape of the route
 * graph. They exist because two opposite mistakes are easy to make here, and
 * F-06 found one of each:
 *
 *   * A route can be **registered but unreachable** — `AISuggestions`,
 *     `PeriodDetail` and `OvulationDetail` were registered long after the
 *     product stopped offering any way to open them.
 *   * A route can look unregistered but be **live** — `MessagesList` and
 *     `Conversation` are not in `MainNavigator` at all, which reads as dead
 *     until you notice `MessagesStack` is mounted inside `ProfileStack` as
 *     the `PartnerMessages` route. (An earlier gate's notes recorded these as
 *     orphaned. They are not.)
 *
 * So the invariant worth protecting is not "this file exists" but "every
 * registered route has a way in, and every removed route stays removed".
 */

declare const __dirname: string;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

const NAV = path.join(__dirname, '..', 'navigation');
const SRC = path.join(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(NAV, rel), 'utf8');
}

/** Every `<Stack.Screen name="X">` in a navigator file. */
function registered(rel: string): string[] {
  const out: string[] = [];
  const re = /name="([A-Za-z]+)"/g;
  let m: RegExpExecArray | null;
  const src = read(rel);
  while ((m = re.exec(src)) !== null) { out.push(m[1]); }
  return out;
}

/** Walk all app sources once. */
function allSources(): Array<{ file: string; text: string }> {
  const out: Array<{ file: string; text: string }> = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'node_modules' && e.name !== '__tests__') { walk(full); }
      } else if (/\.tsx?$/.test(e.name)) {
        out.push({ file: path.relative(SRC, full), text: fs.readFileSync(full, 'utf8') });
      }
    }
  };
  walk(SRC);
  return out;
}

const SOURCES = allSources();

describe('android hardware back', () => {
  it('tabs walk back through visited history, not straight to the first route', () => {
    // Without an explicit setting, bottom-tabs defaults to 'firstRoute':
    // back from any tab jumps to Home, so the screen the user came from is
    // unreachable and two presses always close the app. 'history' is what
    // makes back return to the previous page and exit only from Home.
    expect(read('MainNavigator.tsx')).toMatch(/backBehavior="history"/);
  });
});

describe('route registration', () => {
  it('registers the tabs the product actually has', () => {
    expect(registered('MainNavigator.tsx').sort()).toEqual(
      ['CycleTab', 'HomeTab', 'InsightsTab', 'LogTab', 'ProfileTab'],
    );
  });

  it('keeps the messages stack mounted, because it IS reachable', () => {
    // Reached via Profile → PartnerManage → PartnerMessages → MessagesStack.
    expect(registered('stacks/ProfileStack.tsx')).toContain('PartnerMessages');
    expect(registered('stacks/MessagesStack.tsx').sort()).toEqual(['Conversation', 'MessagesList']);
  });

  it('has an incoming navigation for PartnerMessages', () => {
    const callers = SOURCES.filter(
      s => !s.file.startsWith('navigation') && s.text.includes("'PartnerMessages'"),
    );
    expect(callers.length).toBeGreaterThan(0);
  });
});

describe('removed routes stay removed', () => {
  // Deregistered as superseded/duplicate; their screens are deleted.
  const REMOVED = ['AISuggestions', 'PeriodDetail', 'OvulationDetail'];

  it('are not registered in any navigator', () => {
    const files = ['AuthNavigator.tsx', 'MainNavigator.tsx', 'stacks/CycleStack.tsx',
      'stacks/HomeStack.tsx', 'stacks/InsightsStack.tsx', 'stacks/MessagesStack.tsx',
      'stacks/ProfileStack.tsx', 'stacks/WellnessStack.tsx'];
    const found = files.flatMap(f => registered(f)).filter(r => REMOVED.includes(r));
    expect(found).toEqual([]);
  });

  it('have no navigation call anywhere in the app', () => {
    const offenders: string[] = [];
    for (const r of REMOVED) {
      const re = new RegExp(`navigate\\(\\s*['"]${r}['"]|screen:\\s*['"]${r}['"]`);
      for (const s of SOURCES) {
        if (re.test(s.text)) { offenders.push(`${s.file} → ${r}`); }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('leave no obsolete navigation title behind', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { navTitles } = require('@i18n/strings.fa');
    for (const r of REMOVED) {
      expect(Object.keys(navTitles)).not.toContain(r);
    }
  });
});

describe('no route points at a screen that no longer exists', () => {
  it('every lazy/static screen import in a navigator resolves', () => {
    const navFiles = ['AuthNavigator.tsx', 'MainNavigator.tsx', 'stacks/CycleStack.tsx',
      'stacks/HomeStack.tsx', 'stacks/InsightsStack.tsx', 'stacks/MessagesStack.tsx',
      'stacks/ProfileStack.tsx', 'stacks/WellnessStack.tsx'];
    const missing: string[] = [];
    for (const f of navFiles) {
      const src = read(f);
      const re = /['"]@screens\/([^'"]+)['"]/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const base = path.join(SRC, 'screens', m[1]);
        if (!fs.existsSync(`${base}.tsx`) && !fs.existsSync(`${base}.ts`)) {
          missing.push(`${f} → @screens/${m[1]}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
