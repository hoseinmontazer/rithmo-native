/**
 * devSink — the development verification mechanism for analytics.
 *
 * The gate requires that "Home opened → home_viewed" can actually be
 * observed, not just assumed from source. In __DEV__ this prints every
 * captured event to the Metro console in a single greppable line:
 *
 *     [analytics] home_viewed screen=Home {"learning_mode":false,...}
 *
 * It prints exactly what will be transmitted, so the same output also
 * demonstrates the privacy guarantee: if a health value ever appeared in a
 * payload, it would be visible here.
 *
 * No-op outside __DEV__.
 */
import { addAnalyticsListener } from './client';

let installed = false;

export function installAnalyticsDevSink(): void {
  if (installed || !__DEV__) { return; }
  installed = true;

  addAnalyticsListener((event) => {
    const props = JSON.stringify(event.props ?? {});
    // eslint-disable-next-line no-console
    console.log(
      `[analytics] ${event.name} screen=${event.screen ?? '-'} session=${event.session_id.slice(0, 6)} ${props}`,
    );
  });
}
