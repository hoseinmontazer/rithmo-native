/**
 * When the floating "log today" action is shown.
 *
 * Pure so it can be tested without rendering a navigator. The action is a
 * shortcut, not a destination: it appears at the root of a main tab (never over
 * a pushed screen's own buttons), never while the keyboard is up, and only for
 * accounts that have the Log route at all (partners do not).
 */
/**
 * Only where nothing else on the screen already opens the log.
 *
 *  - Cycle and Patterns: no equivalent entry (Cycle offers "log period" and the
 *    calendar; Patterns is read-only analysis), so the row is the way in.
 *  - Home: already has the "quick log" category row, the check-in prompt and
 *    the log-today suggestions near the top, so a persistent row would repeat
 *    them and cost 56dp of its crowded height.
 *  - Health (urgent guidance, private records) and Profile (a settings list):
 *    not where logging today is the next step; both are one tap from a screen
 *    that offers it.
 */
export const LOG_ACTION_TABS: readonly string[] = ['CycleTab', 'InsightsTab'];

interface TabStateLike {
  index: number;
  routes: Array<{ name: string; state?: { index?: number } }>;
}

export function shouldShowLogAction(state: TabStateLike, keyboardVisible: boolean): boolean {
  if (keyboardVisible) { return false; }
  if (!state.routes.some((r) => r.name === 'LogTab')) { return false; }
  const focused = state.routes[state.index];
  if (!focused || !LOG_ACTION_TABS.includes(focused.name)) { return false; }
  const nested = focused.state;
  return !nested || (nested.index ?? 0) === 0;
}
