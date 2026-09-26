/**
 * Today 2.1 Phase E — E6 regression: cold-start notification-tap queue.
 *
 * On-device, a notification tap that cold-started a killed app landed on
 * Home instead of the adaptive check-in: the queued intent was flushed at
 * NavigationContainer's `onReady`, while RootNavigator was still showing
 * SplashFallback and MainNavigator had not mounted LogTab yet, so the
 * navigation was silently dropped. These are real behavioral tests of the
 * queue's ordering (not source scans) — `@react-navigation/native` is
 * replaced by a controllable fake ref, the same jest.mock convention
 * identityIsolation.test.ts already uses.
 */
jest.mock('@react-navigation/native', () => ({
  createNavigationContainerRef: () => {
    const ref = {
      ready: false,
      routeNames: undefined as string[] | undefined,
      navigate: jest.fn(),
      isReady() { return this.ready; },
      getRootState() { return this.routeNames ? { routeNames: this.routeNames } : undefined; },
    };
    return ref;
  },
}));

type FakeRef = {
  ready: boolean;
  routeNames: string[] | undefined;
  navigate: jest.Mock;
};

type NavigationRefModule = {
  navigationRef: FakeRef;
  navigateToAdaptiveCheckIn: () => void;
  onNavigationContainerReady: () => void;
  onMainNavigatorReady: () => void;
};

// Fresh module (and so fresh queue state) for every test.
function load(): NavigationRefModule {
  let mod: NavigationRefModule | undefined;
  jest.isolateModules(() => {
    mod = require('../navigation/navigationRef');
  });
  return mod as NavigationRefModule;
}

const OWNER_TABS = ['HomeTab', 'CycleTab', 'LogTab', 'InsightsTab', 'ProfileTab'];
const PARTNER_TABS = ['HomeTab', 'ProfileTab'];

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('navigateToAdaptiveCheckIn — warm (app already running)', () => {
  it('navigates immediately when LogTab is already mounted', () => {
    const m = load();
    m.navigationRef.ready = true;
    m.navigationRef.routeNames = OWNER_TABS;
    m.navigateToAdaptiveCheckIn();
    expect(m.navigationRef.navigate).toHaveBeenCalledTimes(1);
    expect(m.navigationRef.navigate).toHaveBeenCalledWith('LogTab', { screen: 'AdaptiveCheckIn' });
  });
});

describe('navigateToAdaptiveCheckIn — cold start (the E6 defect)', () => {
  it('does not navigate, and does not drop the intent, when onReady fires before LogTab exists', () => {
    const m = load();
    // getInitialNotification resolves before the container has mounted.
    m.navigateToAdaptiveCheckIn();
    expect(m.navigationRef.navigate).not.toHaveBeenCalled();

    // Container mounts while RootNavigator is still on SplashFallback —
    // exactly the moment the old code flushed (and lost) the intent.
    m.onNavigationContainerReady();
    expect(m.navigationRef.navigate).not.toHaveBeenCalled();

    // MainNavigator's role gate opens and the tab navigator registers.
    m.navigationRef.ready = true;
    m.navigationRef.routeNames = OWNER_TABS;
    m.onMainNavigatorReady();
    expect(m.navigationRef.navigate).toHaveBeenCalledTimes(1);
    expect(m.navigationRef.navigate).toHaveBeenCalledWith('LogTab', { screen: 'AdaptiveCheckIn' });
  });

  it('never calls navigate while the container is not ready (the source of the dev warning)', () => {
    const m = load();
    m.navigateToAdaptiveCheckIn();
    m.onNavigationContainerReady();
    m.onMainNavigatorReady();
    jest.runAllTimers();
    expect(m.navigationRef.navigate).not.toHaveBeenCalled();
  });

  it('covers the tick between MainNavigator committing and the tab navigator registering', () => {
    const m = load();
    m.navigateToAdaptiveCheckIn();
    m.onMainNavigatorReady(); // tab navigator not registered yet
    expect(m.navigationRef.navigate).not.toHaveBeenCalled();

    m.navigationRef.ready = true;
    m.navigationRef.routeNames = OWNER_TABS;
    jest.advanceTimersByTime(100);
    expect(m.navigationRef.navigate).toHaveBeenCalledTimes(1);
  });

  it('navigates exactly once, however many times the hooks fire', () => {
    const m = load();
    m.navigateToAdaptiveCheckIn();
    m.navigationRef.ready = true;
    m.navigationRef.routeNames = OWNER_TABS;
    m.onNavigationContainerReady();
    m.onMainNavigatorReady();
    m.onMainNavigatorReady();
    jest.runAllTimers();
    expect(m.navigationRef.navigate).toHaveBeenCalledTimes(1);
  });

  it('gives up cleanly (bounded) when LogTab never appears — e.g. a partner account', () => {
    const m = load();
    m.navigateToAdaptiveCheckIn();
    m.navigationRef.ready = true;
    m.navigationRef.routeNames = PARTNER_TABS;
    m.onMainNavigatorReady();
    jest.runAllTimers();
    expect(m.navigationRef.navigate).not.toHaveBeenCalled();

    // The intent is gone — a later, unrelated remount must not navigate.
    m.navigationRef.routeNames = OWNER_TABS;
    m.onMainNavigatorReady();
    jest.runAllTimers();
    expect(m.navigationRef.navigate).not.toHaveBeenCalled();
  });

  it('is a no-op when there is nothing queued (the common, non-notification launch)', () => {
    const m = load();
    m.navigationRef.ready = true;
    m.navigationRef.routeNames = OWNER_TABS;
    m.onNavigationContainerReady();
    m.onMainNavigatorReady();
    jest.runAllTimers();
    expect(m.navigationRef.navigate).not.toHaveBeenCalled();
  });
});
