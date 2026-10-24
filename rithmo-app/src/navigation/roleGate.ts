/**
 * Whether the main tab navigator may mount yet.
 *
 * The tabs differ by role (a partner has no Cycle, Log or Patterns) and React
 * Navigation keeps what it first rendered, so they must never mount under a
 * guessed role. `useRole` falls back to 'owner' when nothing says otherwise.
 *
 * A verified session does NOT make that guess safe: the session check
 * (`users/me/`) carries no role, so a session can be verified while the
 * profile, the only source of the role, has failed or is still being retried.
 * Gating on `sessionVerified` let a verification that finished before a
 * profile retry open the owner tabs for a partner. So the tabs open only on a
 * trusted role, whatever the session state.
 *
 *  - 'wait':    the role is still being read (existing spinner).
 *  - 'unknown': no trusted role (server role, the server's partner rule, or
 *               this device's onboarding choice for the current account).
 *               Show the retry state; credentials stay. An owner whose
 *               profile failed sees it too; that is intended.
 *  - 'open':    mount the tabs.
 *
 * `sessionVerified` is accepted but deliberately does not affect the result.
 */
export type RoleGate = 'wait' | 'unknown' | 'open';

export function roleGate(input: {
  isResolved: boolean;
  hasTrustedRole: boolean;
  sessionVerified: boolean;
}): RoleGate {
  if (!input.isResolved) { return 'wait'; }
  if (!input.hasTrustedRole) { return 'unknown'; }
  return 'open';
}
