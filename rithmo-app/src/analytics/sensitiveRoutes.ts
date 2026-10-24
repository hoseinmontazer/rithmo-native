/**
 * Screens that must not appear in product analytics, not even by name.
 *
 * `screen_viewed` records the active route, and the route name becomes the
 * "current screen" attached to later events. For the contraception and
 * sexual-health area the name alone says something private about a person, so
 * these routes are reported as one neutral label and no `screen_viewed` is sent.
 */
export const SENSITIVE_ROUTES: ReadonlySet<string> = new Set([
  // The tab itself: until its stack has rendered, navigation state reports the
  // tab's name as the active route, and that name is just as telling.
  'HealthTab',
  'HealthGuide',
  'GuideArticle',
  'MethodCompare',
  'MyContraception',
  'HealthChecks',
]);

export const NEUTRAL_SCREEN_LABEL = 'PrivateArea';

export function isSensitiveRoute(name: string): boolean {
  return SENSITIVE_ROUTES.has(name);
}

/**
 * What the navigation container should report for its current state.
 *
 * Walks to the deepest focused route (a tab whose stack has not rendered yet is
 * its own leaf, which is why the tab name is on the sensitive list too).
 * A private route is reported as the neutral label and never as a screen view.
 */
export function describeActiveRoute(
  state: unknown,
): { screen: string; trackRoute: string | null } | null {
  type RouteLike = { name?: string; state?: { index?: number; routes?: RouteLike[] } };
  const root = state as { index?: number; routes?: RouteLike[] } | null | undefined;
  let route: RouteLike | undefined = root?.routes?.[root.index ?? 0];
  while (route?.state) {
    const child: { index?: number; routes?: RouteLike[] } = route.state;
    route = child.routes?.[child.index ?? 0];
  }
  if (!route?.name) { return null; }
  return isSensitiveRoute(route.name)
    ? { screen: NEUTRAL_SCREEN_LABEL, trackRoute: null }
    : { screen: route.name, trackRoute: route.name };
}
