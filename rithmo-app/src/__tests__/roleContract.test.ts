/**
 * The client's idea of "who is a partner" must match the server's.
 *
 * These two rules lived apart and drifted, and the drift was a broken app for
 * an entire class of user:
 *
 *   * server — `intelligence.views._require_owner` rejects a request when
 *     `profile.sex == "male" or profile.user_role == "partner"`.
 *   * client — `useRole` looked only at `user_role`.
 *
 * `user_role` defaults to `'owner'`, so a male account that never took the
 * partner branch of onboarding resolved to 'owner' on the client, was routed
 * to the cycle owner's HomeScreen, and then got 403 from
 * `/api/intelligence/today/`. Verified against the running API: that profile
 * gets 403 from the owner endpoint and 200 from the partner one. The result
 * was a home screen that could only render an error, with no way out.
 *
 * A unit test of `useRole` alone cannot catch this, because in isolation the
 * hook is self-consistent — the bug only exists relative to the server. So
 * this reads both sources and checks they still agree.
 *
 * If the server's rule changes, this test fails and `useRole` must be updated
 * to match. That is the point: the two are one contract, written twice.
 */

export {};

declare const __dirname: string;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

const APP_ROOT = path.join(__dirname, '..', '..');
const USE_ROLE = path.join(APP_ROOT, 'src', 'hooks', 'useRole.ts');
const BACKEND_VIEWS = path.join(
  APP_ROOT, '..', '..', 'rithmo-backend', 'intelligence', 'views.py',
);

const clientSrc: string = fs.readFileSync(USE_ROLE, 'utf8');

describe('the client mirrors the server\'s partner rule', () => {
  it('treats a male profile as a partner', () => {
    // The specific line whose absence caused the 403 loop.
    expect(clientSrc).toMatch(/sex\s*===\s*'male'/);
  });

  it('lets that override user_role rather than losing to it', () => {
    // `user_role` defaults to 'owner', so if the male check did not take
    // precedence the default would win and the bug would return.
    expect(clientSrc).toMatch(/forcedPartner\s*\?\s*'partner'/);
  });

  it('still honours an explicit partner user_role', () => {
    expect(clientSrc).toMatch(/serverRole/);
  });
});

describe('the server\'s rule has not moved out from under the client', () => {
  const hasBackend: boolean = fs.existsSync(BACKEND_VIEWS);

  // The backend is a sibling package in this monorepo. If someone checks out
  // the app alone, skip rather than fail on a missing file.
  const maybe = hasBackend ? it : it.skip;

  maybe('still rejects owner-scoped views for male profiles', () => {
    const backend: string = fs.readFileSync(BACKEND_VIEWS, 'utf8');
    // Slice from the def to the next top-level statement. A naive
    // "up to the first blank line" match stops inside the docstring, which
    // has one — and then silently asserts against the wrong text.
    const start = backend.indexOf('def _require_owner');
    expect(start).toBeGreaterThan(-1);
    const rest = backend.slice(start + 1);
    const nextTop = rest.search(/\n(?:def |class |@)/);
    const body = nextTop === -1 ? rest : rest.slice(0, nextTop);
    // Both halves of the server's condition. If either disappears or a third
    // is added, the client's mirror is stale and must be revisited.
    expect(body).toMatch(/sex\s*==\s*"male"/);
    expect(body).toMatch(/user_role\s*==\s*"partner"/);
  });
});
