/**
 * Partner P0 analytics: typing + call-site contracts. The client never sends
 * a role - the server derives it from the authenticated user.
 */
export {};
declare const __dirname: string;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
const read = (...p: string[]): string => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');

describe('analytics types', () => {
  const types = read('analytics', 'types.ts');
  it('declares partner_support_action_taken with the four action values', () => {
    expect(types).toMatch(/\| 'partner_support_action_taken'/);
    expect(types).toMatch(/partner_support_action_taken: \{ action: PartnerSupportAction \}/);
    expect(types).toMatch(/'message' \| 'checked_in' \| 'time_together' \| 'gave_space'/);
  });
  it('notification_opened carries source list|push', () => {
    expect(types).toMatch(/NotificationOpenSource = 'list' \| 'push'/);
    expect(types).toMatch(/notification_opened: \{ notification_type\?: string; source\?: NotificationOpenSource \}/);
  });
  it('has no role property on any partner event', () => {
    expect(types).not.toMatch(/partner_[a-z_]+: \{[^}]*role/);
  });
});

describe('call sites', () => {
  it('the support action tap tracks "selected" once per tap, in the tap path', () => {
    // P2 moved the tap logic from the component into supportActions.ts
    // (runSupportAction); the component's tap handler delegates to it.
    const logic = read('screens', 'home', 'supportActions.ts');
    expect(logic.match(/track\('partner_support_action_taken'/g)).toHaveLength(1);
    const run = logic.slice(logic.indexOf('export function runSupportAction'));
    expect(run).toMatch(/track\('partner_support_action_taken'/);
    const row = read('screens', 'home', 'components', 'SupportActionRow.tsx');
    expect(row).not.toMatch(/track\('partner_support_action_taken'/);
    expect(row.slice(row.indexOf('const act ='), row.indexOf('const openChat'))).toMatch(/runSupportAction\(/);
  });

  it('NotificationsScreen tags source=list', () => {
    expect(read('screens', 'notifications', 'NotificationsScreen.tsx')).toMatch(/source: 'list'/);
  });

  it('push routing tags source=push', () => {
    expect(read('services', 'pushNotifications.ts')).toMatch(/source: 'push'/);
  });

  it('partner_home_viewed is not driven by an effect on `data` (fired per refetch)', () => {
    const src = read('screens', 'home', 'PartnerHomeScreen.tsx');
    expect(src).not.toMatch(/\}, \[data\]\)/);
    expect(src).toMatch(/useFocusEffect/);
    expect(src).toMatch(/viewedRef/);
  });
});
