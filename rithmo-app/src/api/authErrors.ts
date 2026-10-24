/**
 * Is this failure the server saying "this session is over", or just the
 * server being unreachable?
 *
 * Only the first may cost the user their saved session. Session restore used
 * to clear the tokens on ANY failure, so opening the app offline, on a timeout
 * or during a server outage signed the user out (reproduced on a device: an
 * offline cold start landed on the login screen and stayed there after the
 * network came back).
 *
 *  - Terminal: the server answered 401/403 for the session, or there is no
 *    refresh token to try. For the refresh call itself a 400 is terminal too
 *    (simple-jwt rejects an unusable token there), so a dead token cannot
 *    leave the app retrying forever.
 *  - Temporary: no response at all (offline, DNS, timeout), 5xx, 408, 429, or
 *    anything else. The session is merely unverified, not invalid.
 */
export const MISSING_REFRESH_TOKEN_MESSAGE = 'No refresh token available';

/** Thrown when a refresh is needed but no refresh token is stored. Always terminal. */
export class MissingRefreshTokenError extends Error {
  readonly isMissingRefreshToken = true;
  constructor() {
    // Same message as before: errorHandler maps it to the Persian
    // "your session has ended" copy.
    super(MISSING_REFRESH_TOKEN_MESSAGE);
    this.name = 'MissingRefreshTokenError';
    Object.setPrototypeOf(this, MissingRefreshTokenError.prototype);
  }
}

const TERMINAL_STATUSES: readonly number[] = [401, 403];
const TERMINAL_REFRESH_STATUSES: readonly number[] = [400, 401, 403];

export function isTerminalAuthRejection(
  error: unknown,
  options: { refreshRequest?: boolean } = {},
): boolean {
  if ((error as { isMissingRefreshToken?: boolean } | null)?.isMissingRefreshToken === true) {
    return true;
  }
  const status = (error as { response?: { status?: unknown } } | null)?.response?.status;
  if (typeof status !== 'number') { return false; } // no response: offline, timeout, DNS
  const terminal = options.refreshRequest ? TERMINAL_REFRESH_STATUSES : TERMINAL_STATUSES;
  return terminal.includes(status);
}
