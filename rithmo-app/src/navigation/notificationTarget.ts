/**
 * The ONE place a notification is mapped to an in-app destination.
 *
 * Used by push taps (cold start, warm tap, foreground-open - all through
 * services/pushNotifications.ts) and by taps in the in-app NotificationsScreen.
 *
 * Push `data` carries an explicit `target` ('partner_home' | 'messages' | '').
 * Server-side notification objects (the in-app list) have no `target`, so it
 * is derived from `notification_type` + `related_type`. Pure and dependency
 * free so it is trivially testable.
 */
export type NotificationTarget = 'partner_home' | 'messages' | 'adaptive_checkin';

export interface NotificationTargetInput {
  notification_type?: string | null;
  related_type?: string | null;
  target?: string | null;
}

/** Explicit targets the server may send. Anything else is ignored. */
const EXPLICIT_TARGETS: ReadonlyArray<string> = ['partner_home', 'messages'];

export function resolveNotificationTarget(
  input: NotificationTargetInput | null | undefined,
): NotificationTarget | null {
  if (!input) { return null; }
  const { notification_type: type, related_type: relatedType, target } = input;

  if (typeof target === 'string' && EXPLICIT_TARGETS.includes(target)) {
    return target as NotificationTarget;
  }
  if (type === 'partner_message' && relatedType === 'partner_message') { return 'messages'; }
  if (type === 'partner_message' && relatedType === 'partner') { return 'partner_home'; }
  if (type === 'system' && relatedType === 'partner') { return 'partner_home'; }
  if (type === 'wellness_reminder') { return 'adaptive_checkin'; }
  return null;
}
