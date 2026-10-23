/**
 * Sign-out must deregister this device's push token, but never fail or hang.
 */
const mockDeregister = jest.fn();
jest.mock('@api/services/notificationService', () => ({
  notificationService: { deregisterPushToken: (...a: unknown[]) => mockDeregister(...a) },
}));

const mockGetToken = jest.fn();
jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: () => ({ getToken: mockGetToken }),
}), { virtual: true });

import { deregisterPushTokenBestEffort } from '@utils/pushTokenCleanup';

beforeEach(() => {
  mockDeregister.mockReset();
  mockGetToken.mockReset();
});

describe('deregisterPushTokenBestEffort', () => {
  it('posts the current device token', async () => {
    mockGetToken.mockResolvedValue('tok-1');
    mockDeregister.mockResolvedValue({});
    await deregisterPushTokenBestEffort();
    expect(mockDeregister).toHaveBeenCalledWith('tok-1');
  });

  it('does nothing when there is no token', async () => {
    mockGetToken.mockResolvedValue('');
    await deregisterPushTokenBestEffort();
    expect(mockDeregister).not.toHaveBeenCalled();
  });

  it('swallows network failures so sign-out still completes', async () => {
    mockGetToken.mockResolvedValue('tok-1');
    mockDeregister.mockRejectedValue(new Error('offline'));
    await expect(deregisterPushTokenBestEffort()).resolves.toBeUndefined();
  });

  it('does not wait longer than the timeout on a hung request', async () => {
    jest.useFakeTimers();
    mockGetToken.mockResolvedValue('tok-1');
    mockDeregister.mockReturnValue(new Promise(() => undefined));
    const done = deregisterPushTokenBestEffort();
    await jest.advanceTimersByTimeAsync(3100);
    await expect(done).resolves.toBeUndefined();
    jest.useRealTimers();
  });
});
