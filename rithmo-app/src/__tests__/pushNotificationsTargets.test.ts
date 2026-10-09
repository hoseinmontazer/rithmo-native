/**
 * Push taps for partner targets: same resolver, same messageId dedupe, and
 * notification_opened{source:'push'} fired once per tap.
 */
export {};

type Listener = (msg: unknown) => void;
type AppStateListener = (state: string) => void;

const mockFake = {
  openedListener: null as Listener | null,
  appStateListener: null as AppStateListener | null,
  initialQueue: [] as unknown[],
  checkin: jest.fn(),
  toTarget: jest.fn(),
  track: jest.fn(),
};

jest.mock('@react-native-firebase/messaging', () => {
  const instance = {
    onMessage: () => jest.fn(),
    onNotificationOpenedApp: (cb: Listener) => { mockFake.openedListener = cb; return jest.fn(); },
    getInitialNotification: () => Promise.resolve(mockFake.initialQueue.shift() ?? null),
  };
  return { __esModule: true, default: () => instance };
});

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: (_t: string, cb: AppStateListener) => {
      mockFake.appStateListener = cb;
      return { remove: jest.fn() };
    },
  },
  PermissionsAndroid: {},
  Platform: { OS: 'android', Version: 34 },
}));

jest.mock('@navigation/navigationRef', () => ({
  navigateToAdaptiveCheckIn: () => mockFake.checkin(),
  navigateToNotificationTarget: (t: unknown) => mockFake.toTarget(t),
}), { virtual: true });

jest.mock('@analytics', () => ({ track: (...a: unknown[]) => mockFake.track(...a) }), { virtual: true });

function load(): { setupNotificationListeners: () => () => void } {
  let mod: unknown;
  jest.isolateModules(() => { mod = require('../services/pushNotifications'); });
  return mod as { setupNotificationListeners: () => () => void };
}

const flush = () => new Promise<void>(resolve => setImmediate(() => resolve()));
const push = (id: string, data: Record<string, string>) => ({ messageId: id, data });

let logSpy: jest.SpyInstance;
beforeEach(() => {
  mockFake.openedListener = null;
  mockFake.appStateListener = null;
  mockFake.initialQueue = [];
  mockFake.checkin.mockClear();
  mockFake.toTarget.mockClear();
  mockFake.track.mockClear();
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => { logSpy.mockRestore(); });

describe('partner push targets', () => {
  it('routes an explicit messages target and tracks source=push', async () => {
    load().setupNotificationListeners();
    await flush();
    mockFake.openedListener?.(push('a1', { notification_type: 'partner_message', related_type: 'partner_message', target: 'messages' }));
    expect(mockFake.toTarget).toHaveBeenCalledWith('messages');
    expect(mockFake.track).toHaveBeenCalledWith('notification_opened', { notification_type: 'partner_message', source: 'push' });
  });

  it('derives the target when the payload has none (older server)', async () => {
    load().setupNotificationListeners();
    await flush();
    mockFake.openedListener?.(push('a2', { notification_type: 'system', related_type: 'partner' }));
    expect(mockFake.toTarget).toHaveBeenCalledWith('partner_home');
  });

  it('cold start path routes through the same resolver', async () => {
    mockFake.initialQueue.push(push('a3', { notification_type: 'partner_message', target: 'partner_home' }));
    load().setupNotificationListeners();
    await flush();
    expect(mockFake.toTarget).toHaveBeenCalledWith('partner_home');
  });

  it('dedupes a tap seen by both the opened event and the foreground check', async () => {
    load().setupNotificationListeners();
    await flush();
    const msg = push('a4', { notification_type: 'partner_message', target: 'messages' });
    mockFake.openedListener?.(msg);
    mockFake.initialQueue.push(msg);
    mockFake.appStateListener?.('active');
    await flush();
    expect(mockFake.toTarget).toHaveBeenCalledTimes(1);
    expect(mockFake.track).toHaveBeenCalledTimes(1);
  });

  it('keeps adaptive check-in on its own entry point', async () => {
    load().setupNotificationListeners();
    await flush();
    mockFake.openedListener?.(push('a5', { notification_type: 'wellness_reminder' }));
    expect(mockFake.checkin).toHaveBeenCalledTimes(1);
    expect(mockFake.toTarget).not.toHaveBeenCalled();
  });

  it('unknown type: tracked, but no navigation', async () => {
    load().setupNotificationListeners();
    await flush();
    mockFake.openedListener?.(push('a6', { notification_type: 'cycle_prediction' }));
    expect(mockFake.toTarget).not.toHaveBeenCalled();
    expect(mockFake.checkin).not.toHaveBeenCalled();
    expect(mockFake.track).toHaveBeenCalledTimes(1);
  });
});
