/**
 * Queue behaviour for the partner/message notification targets. Same fake
 * ref convention as navigationRefColdStart.test.ts.
 */
export {};

jest.mock('@react-navigation/native', () => ({
  createNavigationContainerRef: () => ({
    ready: false,
    routeNames: undefined as string[] | undefined,
    navigate: jest.fn(),
    isReady() { return this.ready; },
    getRootState() { return this.routeNames ? { routeNames: this.routeNames } : undefined; },
  }),
}));

type FakeRef = { ready: boolean; routeNames: string[] | undefined; navigate: jest.Mock };
type Mod = {
  navigationRef: FakeRef;
  navigateToNotificationTarget: (t: 'partner_home' | 'messages' | 'adaptive_checkin' | null) => void;
  onNavigationContainerReady: () => void;
  onMainNavigatorReady: () => void;
};

function load(): Mod {
  let mod: Mod | undefined;
  jest.isolateModules(() => { mod = require('../navigation/navigationRef'); });
  return mod as Mod;
}

const OWNER_TABS = ['HomeTab', 'CycleTab', 'LogTab', 'InsightsTab', 'ProfileTab'];
const PARTNER_TABS = ['HomeTab', 'ProfileTab'];

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

describe('messages target', () => {
  it('navigates ProfileTab > PartnerMessages > MessagesList when warm', () => {
    const m = load();
    m.navigationRef.ready = true;
    m.navigationRef.routeNames = PARTNER_TABS;
    m.navigateToNotificationTarget('messages');
    expect(m.navigationRef.navigate).toHaveBeenCalledWith('ProfileTab', {
      screen: 'PartnerMessages',
      params: { screen: 'MessagesList' },
    });
  });

  it('waits on cold start until the tab navigator exists, then navigates once', () => {
    const m = load();
    m.navigateToNotificationTarget('messages');
    m.onNavigationContainerReady();
    expect(m.navigationRef.navigate).not.toHaveBeenCalled();
    m.navigationRef.ready = true;
    m.navigationRef.routeNames = PARTNER_TABS;
    m.onMainNavigatorReady();
    m.onMainNavigatorReady();
    jest.runAllTimers();
    expect(m.navigationRef.navigate).toHaveBeenCalledTimes(1);
  });
});

describe('partner_home target', () => {
  it('navigates HomeTab > Home', () => {
    const m = load();
    m.navigationRef.ready = true;
    m.navigationRef.routeNames = PARTNER_TABS;
    m.navigateToNotificationTarget('partner_home');
    expect(m.navigationRef.navigate).toHaveBeenCalledWith('HomeTab', { screen: 'Home' });
  });

  it('picks up after the tick between mount and navigator registration', () => {
    const m = load();
    m.navigateToNotificationTarget('partner_home');
    m.onMainNavigatorReady();
    m.navigationRef.ready = true;
    m.navigationRef.routeNames = OWNER_TABS;
    jest.advanceTimersByTime(100);
    expect(m.navigationRef.navigate).toHaveBeenCalledTimes(1);
  });
});

describe('robustness', () => {
  it('gives up cleanly when the needed tab never appears', () => {
    const m = load();
    m.navigateToNotificationTarget('adaptive_checkin');
    m.navigationRef.ready = true;
    m.navigationRef.routeNames = PARTNER_TABS;
    m.onMainNavigatorReady();
    jest.runAllTimers();
    expect(m.navigationRef.navigate).not.toHaveBeenCalled();
  });

  it('a null target is a no-op', () => {
    const m = load();
    m.navigationRef.ready = true;
    m.navigationRef.routeNames = OWNER_TABS;
    m.navigateToNotificationTarget(null);
    expect(m.navigationRef.navigate).not.toHaveBeenCalled();
  });

  it('never throws when navigate throws', () => {
    const m = load();
    m.navigationRef.ready = true;
    m.navigationRef.routeNames = OWNER_TABS;
    m.navigationRef.navigate.mockImplementation(() => { throw new Error('boom'); });
    expect(() => m.navigateToNotificationTarget('messages')).not.toThrow();
  });

  it('latest queued target wins', () => {
    const m = load();
    m.navigateToNotificationTarget('messages');
    m.navigateToNotificationTarget('partner_home');
    m.navigationRef.ready = true;
    m.navigationRef.routeNames = PARTNER_TABS;
    m.onMainNavigatorReady();
    expect(m.navigationRef.navigate).toHaveBeenCalledTimes(1);
    expect(m.navigationRef.navigate).toHaveBeenCalledWith('HomeTab', { screen: 'Home' });
  });
});
