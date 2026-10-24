/**
 * The main tabs must never mount under a guessed 'owner' role.
 *
 * After the offline-session fix, a cold start without a network keeps the
 * saved tokens and marks the session unverified. The profile request then
 * fails, and `useRole` falls back to 'owner' when no other source names the
 * role, so a partner account that signed in normally (no device-local
 * onboarding role) got the owner's tab shell. React Navigation keeps what it
 * first mounts, which is exactly what MainNavigator's gate exists to prevent.
 */
declare const __dirname: string;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

import { roleGate } from '../navigation/roleGate';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]): string => fs.readFileSync(path.join(SRC, ...p), 'utf8');

describe('roleGate decides when the tabs may mount', () => {
  it('pending role: waits, whatever else is known', () => {
    for (const hasTrustedRole of [true, false]) {
      for (const sessionVerified of [true, false]) {
        expect(roleGate({ isResolved: false, hasTrustedRole, sessionVerified })).toBe('wait');
      }
    }
  });

  it('resolved without a trusted role, unverified session: retry state', () => {
    expect(roleGate({ isResolved: true, hasTrustedRole: false, sessionVerified: false })).toBe('unknown');
  });

  it('resolved without a trusted role, VERIFIED session: still the retry state, never a guessed owner', () => {
    // users/me/ carries no role, so a verified session says nothing about it.
    expect(roleGate({ isResolved: true, hasTrustedRole: false, sessionVerified: true })).toBe('unknown');
  });

  it('trusted role (server profile or its partner rule): opens, verified or not', () => {
    expect(roleGate({ isResolved: true, hasTrustedRole: true, sessionVerified: true })).toBe('open');
    expect(roleGate({ isResolved: true, hasTrustedRole: true, sessionVerified: false })).toBe('open');
  });

  it('trusted local role (onboarding choice on this device): opens, as before', () => {
    // useRole counts the device onboarding role as trusted (see below); the gate
    // treats every trusted source the same.
    expect(roleGate({ isResolved: true, hasTrustedRole: true, sessionVerified: false })).toBe('open');
  });
});

/**
 * The race this fixes, replayed as the sequence of inputs MainNavigator sees.
 * Retry calls refetchProfile() and revalidateSession() together. With React
 * Query 5 a refetch of a failed query keeps it in the error state, so useRole
 * stays resolved (no trusted role) while the refetch runs; if the session
 * check finishes first, sessionVerified flips to true before any role exists.
 */
describe('retry sequence', () => {
  const gates = (steps: Array<{ hasTrustedRole: boolean; sessionVerified: boolean }>) =>
    steps.map((s) => roleGate({ isResolved: true, ...s }));

  it('session verified before the profile retry finishes: the gate stays closed', () => {
    expect(gates([
      { hasTrustedRole: false, sessionVerified: false }, // offline start, profile failed
      { hasTrustedRole: false, sessionVerified: true },  // revalidateSession() won the race
    ])).toEqual(['unknown', 'unknown']);
  });

  it('profile retry succeeds with a trusted role: the gate opens', () => {
    expect(gates([
      { hasTrustedRole: false, sessionVerified: false },
      { hasTrustedRole: false, sessionVerified: true },
      { hasTrustedRole: true, sessionVerified: true },   // profile arrived: server role
    ])).toEqual(['unknown', 'unknown', 'open']);
  });

  it('profile retry fails again: still closed, still retryable', () => {
    expect(gates([
      { hasTrustedRole: false, sessionVerified: true },
      { hasTrustedRole: false, sessionVerified: true },
    ])).toEqual(['unknown', 'unknown']);
  });

  it('the gate ignores sessionVerified entirely', () => {
    for (const isResolved of [true, false]) {
      for (const hasTrustedRole of [true, false]) {
        expect(roleGate({ isResolved, hasTrustedRole, sessionVerified: true }))
          .toBe(roleGate({ isResolved, hasTrustedRole, sessionVerified: false }));
      }
    }
  });
});

describe('useRole reports where the role came from', () => {
  const src = read('hooks', 'useRole.ts');

  it('trusts only the server profile, its partner rule, or the device onboarding choice', () => {
    expect(src).toMatch(/const hasTrustedRole = forcedPartner \|\| serverRole !== null \|\| localRole !== null;/);
    expect(src).toMatch(/hasTrustedRole, setRole \}/);
  });

  it('still mirrors the server partner rule (unchanged)', () => {
    expect(src).toMatch(/const role: UserRole = forcedPartner \? 'partner' : \(serverRole \?\? localRole \?\? 'owner'\);/);
  });

  it('the device role can only belong to the current account: wiped at every sign-in and sign-out', () => {
    const store = read('store', 'authStore.ts');
    expect(store).toMatch(/AsyncStorage\.removeItem\(ONBOARDING_ROLE_KEY\)/);
    const login = store.slice(store.indexOf('login: async'), store.indexOf('logout: async'));
    const logout = store.slice(store.indexOf('logout: async'), store.lastIndexOf('setUser:'));
    expect(login).toMatch(/await clearIdentityState\(\)/);
    expect(logout).toMatch(/await clearIdentityState\(\)/);
  });
});

describe('MainNavigator applies the gate', () => {
  const src = read('navigation', 'MainNavigator.tsx');
  const body = src.slice(src.indexOf('export function MainNavigator'));

  it('computes the gate from the role source and the session state', () => {
    expect(body).toMatch(/roleGate\(\{ isResolved, hasTrustedRole, sessionVerified \}\)/);
    expect(body).toMatch(/useAuthStore\(\(s\) => s\.sessionVerified\)/);
  });

  it('shows a retry state, not the tabs, for an unknown role', () => {
    const unknown = body.slice(body.indexOf("if (gate === 'unknown')"), body.indexOf('<Tab.Navigator'));
    expect(unknown).toMatch(/<ErrorState/);
    expect(unknown).toMatch(/refetchProfile\(\)/);
    expect(unknown).toMatch(/revalidateSession\(\)/);
    expect(unknown).toMatch(/return \(/);
    // The unknown branch returns before the tab navigator is reached.
    expect(body.indexOf("if (gate === 'unknown')")).toBeLessThan(body.indexOf('<Tab.Navigator'));
  });

  it('never signs the user out or clears credentials from the gate', () => {
    expect(body).not.toMatch(/logout\(|clearTokens|clearIdentityState/);
  });

  it('flushes a queued notification navigation only once the tabs actually mount', () => {
    expect(body).toMatch(/if \(gate === 'open'\) \{\s*onMainNavigatorReady\(\);/);
    // The only call site: nothing else releases the queue.
    expect(src.match(/onMainNavigatorReady\(\)/g)?.length).toBe(1);
  });

  it('keeps queued taps queued through the race: no step before the profile arrives is open', () => {
    const steps = [
      roleGate({ isResolved: false, hasTrustedRole: false, sessionVerified: false }),
      roleGate({ isResolved: true, hasTrustedRole: false, sessionVerified: false }),
      roleGate({ isResolved: true, hasTrustedRole: false, sessionVerified: true }),
    ];
    expect(steps).not.toContain('open');
  });

  it('keeps the existing spinner while the role is still being read', () => {
    expect(body).toMatch(/if \(!isResolved\) \{[\s\S]{0,200}<ActivityIndicator/);
  });

  it('keeps owner-only tabs behind the partner check (unchanged)', () => {
    expect(body).toMatch(/\{!isPartner && \(/);
  });
});
