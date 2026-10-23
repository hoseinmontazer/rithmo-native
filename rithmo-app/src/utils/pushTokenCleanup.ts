/**
 * Best-effort push-token deregistration for sign-out.
 *
 * Without it the departed account keeps receiving pushes on this device until
 * another account registers the same token. Never throws and never waits
 * longer than DEREGISTER_TIMEOUT_MS: an offline or already-expired session
 * must not prevent signing out.
 */
import { notificationService } from '@api/services/notificationService';

export const DEREGISTER_TIMEOUT_MS = 3000;

function getMessaging(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-firebase/messaging').default;
    mod();
    return mod;
  } catch {
    return null;
  }
}

export async function deregisterPushTokenBestEffort(): Promise<void> {
  const work = (async () => {
    const messaging = getMessaging();
    if (!messaging) { return; }
    const token: string = await messaging().getToken();
    if (!token) { return; }
    await notificationService.deregisterPushToken(token);
  })().catch(() => undefined);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, DEREGISTER_TIMEOUT_MS);
  });
  await Promise.race([work, timeout]);
  if (timer) { clearTimeout(timer); }
}
