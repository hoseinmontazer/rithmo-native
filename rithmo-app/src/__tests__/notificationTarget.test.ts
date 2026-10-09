import { resolveNotificationTarget } from '../navigation/notificationTarget';

describe('resolveNotificationTarget', () => {
  it('explicit valid target wins', () => {
    expect(resolveNotificationTarget({ notification_type: 'system', target: 'messages' })).toBe('messages');
    expect(resolveNotificationTarget({ notification_type: 'wellness_reminder', target: 'partner_home' })).toBe('partner_home');
  });

  it('empty or invalid target falls back to derivation', () => {
    expect(resolveNotificationTarget({ notification_type: 'wellness_reminder', target: '' })).toBe('adaptive_checkin');
    expect(resolveNotificationTarget({ notification_type: 'wellness_reminder', target: 'bogus' })).toBe('adaptive_checkin');
    expect(resolveNotificationTarget({ notification_type: 'period', target: 'bogus' })).toBeNull();
  });

  it('derives partner targets from type + related_type', () => {
    expect(resolveNotificationTarget({ notification_type: 'partner_message', related_type: 'partner_message' })).toBe('messages');
    expect(resolveNotificationTarget({ notification_type: 'partner_message', related_type: 'partner' })).toBe('partner_home');
    expect(resolveNotificationTarget({ notification_type: 'system', related_type: 'partner' })).toBe('partner_home');
  });

  it('wellness_reminder routes to the adaptive check-in', () => {
    expect(resolveNotificationTarget({ notification_type: 'wellness_reminder' })).toBe('adaptive_checkin');
  });

  it('everything else is null', () => {
    expect(resolveNotificationTarget({ notification_type: 'system' })).toBeNull();
    expect(resolveNotificationTarget({ notification_type: 'partner_message' })).toBeNull();
    expect(resolveNotificationTarget({ notification_type: 'cycle_prediction', related_type: 'partner' })).toBeNull();
    expect(resolveNotificationTarget({})).toBeNull();
    expect(resolveNotificationTarget(null)).toBeNull();
    expect(resolveNotificationTarget(undefined)).toBeNull();
  });
});
