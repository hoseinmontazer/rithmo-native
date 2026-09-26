/**
 * Today 2.1 Phase E — E2 regression: warm-tap routing.
 *
 * On-device, tapping a wellness_reminder while the app was backgrounded
 * (not killed) left the user wherever they were: the headless JS task RN
 * 0.75 boots for every background push re-attaches RNFB's singleton event
 * emitter to a second runtime, so onNotificationOpenedApp never reaches the
 * UI runtime. The fix reads getInitialNotification() when AppState turns
 * 'active'. These are behavioral tests of that path and of the messageId
 * dedupe, with Firebase, react-native, and navigationRef all mocked.
 */
export {};

type Listener = (msg: unknown) => void;
type AppStateListener = (state: string) => void;

const mockFake = {
  openedListener: null as Listener | null,
  appStateListener: null as AppStateListener | null,
  initialQueue: [] as unknown[],
  navigate: jest.fn(),
  unsubMessage: jest.fn(),
  unsubOpened: jest.fn(),
  removeAppState: jest.fn(),
};

jest.mock('@react-native-firebase/messaging', () => {
  const instance = {
    onMessage: () => mockFake.unsubMessage,
    onNotificationOpenedApp: (cb: Listener) => {
      mockFake.openedListener = cb;
      return mockFake.unsubOpened;
    },
    getInitialNotification: () => Promise.resolve(mockFake.initialQueue.shift() ?? null),
  };
  const messaging = () => instance;
  return { __esModule: true, default: messaging };
});

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: (_type: string, cb: AppStateListener) => {
      mockFake.appStateListener = cb;
      return { remove: mockFake.removeAppState };
    },
  },
  PermissionsAndroid: {},
  Platform: { OS: 'android', Version: 34 },
}));

jest.mock('@navigation/navigationRef', () => ({
  navigateToAdaptiveCheckIn: () => mockFake.navigate(),
}), { virtual: true });

type PushModule = { setupNotificationListeners: () => () => void };

function load(): PushModule {
  let mod: PushModule | undefined;
  jest.isolateModules(() => {
    mod = require('../services/pushNotifications');
  });
  return mod as PushModule;
}

const reminder = (id: string) => ({ messageId: id, data: { notification_type: 'wellness_reminder' } });
const flush = () => new Promise<void>(resolve => setImmediate(() => resolve()));

let logSpy: jest.SpyInstance;

beforeEach(() => {
  mockFake.openedListener = null;
  mockFake.appStateListener = null;
  mockFake.initialQueue = [];
  mockFake.navigate.mockClear();
  mockFake.unsubMessage.mockClear();
  mockFake.unsubOpened.mockClear();
  mockFake.removeAppState.mockClear();
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
});

describe('warm tap (E2)', () => {
  it('routes when the opened event is lost but getInitialNotification has the tap', async () => {
    load().setupNotificationListeners();
    await flush(); // launch-time getInitialNotification: nothing
    mockFake.initialQueue.push(reminder('m1'));
    mockFake.appStateListener?.('active');
    await flush();
    expect(mockFake.navigate).toHaveBeenCalledTimes(1);
  });

  it('navigates once when both the opened event and the foreground check see the same tap', async () => {
    load().setupNotificationListeners();
    await flush();
    mockFake.openedListener?.(reminder('m2'));
    mockFake.initialQueue.push(reminder('m2'));
    mockFake.appStateListener?.('active');
    await flush();
    expect(mockFake.navigate).toHaveBeenCalledTimes(1);
  });

  it('routes a second, distinct tap', async () => {
    load().setupNotificationListeners();
    await flush();
    mockFake.initialQueue.push(reminder('m3'));
    mockFake.appStateListener?.('active');
    await flush();
    mockFake.initialQueue.push(reminder('m4'));
    mockFake.appStateListener?.('active');
    await flush();
    expect(mockFake.navigate).toHaveBeenCalledTimes(2);
  });

  it('does nothing on a plain foreground return with no tapped notification', async () => {
    load().setupNotificationListeners();
    await flush();
    mockFake.appStateListener?.('active');
    await flush();
    expect(mockFake.navigate).not.toHaveBeenCalled();
  });

  it('ignores non-active transitions and other notification types', async () => {
    load().setupNotificationListeners();
    await flush();
    mockFake.initialQueue.push(reminder('m5'));
    mockFake.appStateListener?.('background');
    await flush();
    expect(mockFake.navigate).not.toHaveBeenCalled();

    mockFake.initialQueue = [{ messageId: 'm6', data: { notification_type: 'cycle_prediction' } }];
    mockFake.appStateListener?.('active');
    await flush();
    expect(mockFake.navigate).not.toHaveBeenCalled();
  });

  it('cleanup removes all three subscriptions', () => {
    const cleanup = load().setupNotificationListeners();
    cleanup();
    expect(mockFake.unsubMessage).toHaveBeenCalledTimes(1);
    expect(mockFake.unsubOpened).toHaveBeenCalledTimes(1);
    expect(mockFake.removeAppState).toHaveBeenCalledTimes(1);
  });
});
