/**
 * Screens that must not appear in product analytics, not even by name.
 *
 * `screen_viewed` records the active route, and the route name becomes the
 * "current screen" attached to later events. For the contraception and
 * sexual-health area the name alone says something private about a person, so
 * these routes are reported as one neutral label and no `screen_viewed` is sent.
 */
export const SENSITIVE_ROUTES: ReadonlySet<string> = new Set([
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
