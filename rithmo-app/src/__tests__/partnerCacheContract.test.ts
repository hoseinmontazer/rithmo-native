/**
 * Linking or unlinking a partner must clear BOTH caches that read partner state.
 *
 * `profile.partners` is read twice, through two independent React Query
 * caches: `useProfile` reads it directly, and `usePartnerToday` reads
 * `/api/intelligence/partner/today/`, whose view resolves the owner from that
 * same field (`profile.partners...first()`).
 *
 * The mutations invalidated only the profile. The intelligence cache went on
 * serving its previous answer for its whole stale window, so two screens
 * showed contradictory truths about one database row — Settings reporting a
 * partner while PartnerHome reported none. Reported from a device, not caught
 * by any test, because each hook is individually correct; the bug only exists
 * between them.
 *
 * Asserted at source level: a runtime test would need a React renderer and
 * would still not prove the OTHER cache was cleared.
 */

export {};

declare const __dirname: string;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

const SRC = path.join(__dirname, '..');
const HOOKS = path.join(SRC, 'hooks', 'queries', 'useProfile.ts');
const source: string = fs.readFileSync(HOOKS, 'utf8');

/** The hooks that change whether a partner link exists. */
const MUTATIONS = ['useAcceptInvitation', 'useRemovePartner', 'useSelfRevokePartner'];

/** The body of a named export, up to the next top-level export. */
function bodyOf(name: string): string {
  const start = source.indexOf(`export function ${name}(`);
  if (start === -1) { return ''; }
  const rest = source.slice(start + 1);
  const next = rest.indexOf('\nexport function ');
  return next === -1 ? rest : rest.slice(0, next);
}

describe('partner mutations clear every cache that reads partner state', () => {
  it('still has all three mutations', () => {
    for (const name of MUTATIONS) {
      expect(bodyOf(name)).not.toBe('');
    }
  });

  for (const name of MUTATIONS) {
    it(`${name} invalidates partner state as a whole`, () => {
      const body = bodyOf(name);
      // Either through the shared helper, or explicitly touching both roots.
      const viaHelper = /invalidatePartnerState\(/.test(body);
      const explicit =
        /queryKeys\.profile\.all\(\)/.test(body) &&
        /queryKeys\.intelligence\.all\(\)/.test(body);
      expect({ name, clearsBoth: viaHelper || explicit })
        .toEqual({ name, clearsBoth: true });
    });
  }

  it('the shared helper really clears both roots', () => {
    const helper = source.slice(
      source.indexOf('function invalidatePartnerState'),
      source.indexOf('export function useAcceptInvitation'),
    );
    expect(helper).toMatch(/queryKeys\.profile\.all\(\)/);
    expect(helper).toMatch(/queryKeys\.intelligence\.all\(\)/);
  });
});
