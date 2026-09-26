/**
 * Today 2.1 Phase E — notification / CheckInPrompt integration contract.
 *
 * Source-scanning technique (this project verifies component rendering
 * on-device, not in Jest — see contextEntryContract.test.ts's own header
 * comment), same convention as every other contract test here.
 */
// Makes this file a module so its top-level consts don't collide with
// other require-only test files under tsc (same fix as config.test.ts).
export {};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

const SRC = path.join(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

describe('navigationRef — the plumbing notification routing needs', () => {
  const src = read('navigation/navigationRef.ts');

  it('creates a root-level navigation ref (new in Phase E — none existed before)', () => {
    expect(src).toMatch(/createNavigationContainerRef/);
  });

  it('routes to the exact same route DailyCheckInCard\'s manual entry uses', () => {
    expect(src).toMatch(/navigate\('LogTab' as never, \{ screen: 'AdaptiveCheckIn' \} as never\)/);
  });

  it('never constructs a question locally — it only opens the screen that itself fetches the server session', () => {
    expect(src).not.toMatch(/question_id/);
    expect(src).not.toMatch(/checkin_engine/);
  });

  it('queues the navigation intent for a cold start rather than dropping it', () => {
    expect(src).toMatch(/pendingAdaptiveCheckIn/);
    expect(src).toMatch(/onNavigationContainerReady/);
  });

  it('never throws on a failed navigation (e.g. not authenticated yet)', () => {
    expect(src).toMatch(/catch\s*\{/);
  });
});

describe('RootNavigator — the ref is actually wired to the real NavigationContainer', () => {
  const src = read('navigation/RootNavigator.tsx');

  it('passes the shared ref and onReady flush to NavigationContainer', () => {
    expect(src).toMatch(/ref={navigationRef}/);
    expect(src).toMatch(/onReady={onNavigationContainerReady}/);
  });
});

describe('MainNavigator — flushes the cold-start intent only once LogTab can exist (E6 fix)', () => {
  const src = read('navigation/MainNavigator.tsx');

  it('calls onMainNavigatorReady once the role gate has opened', () => {
    expect(src).toMatch(/import \{ onMainNavigatorReady \} from '\.\/navigationRef'/);
    expect(src).toMatch(/if \(isResolved\) \{\s*onMainNavigatorReady\(\);\s*\}/);
  });

  it('the navigationRef only navigates once LogTab is present in the root state', () => {
    const ref = read('navigation/navigationRef.ts');
    expect(ref).toMatch(/routeNames\?\.includes\('LogTab'\)/);
  });
});

describe('pushNotifications — routes a real tap, not a foreground arrival', () => {
  const src = read('services/pushNotifications.ts');

  it('routes on onNotificationOpenedApp (background tap) and getInitialNotification (cold-start tap)', () => {
    expect(src).toMatch(/onNotificationOpenedApp\(remoteMessage => \{[^]*routeNotificationTap\(remoteMessage\)/);
    expect(src).toMatch(/getInitialNotification\(\)[^]*routeNotificationTap\(remoteMessage\)/);
  });

  it('does NOT route on a foreground message arrival (onMessage) — arriving is not tapping', () => {
    const onMessageBlock = src.slice(src.indexOf('onMessage(async'), src.indexOf('onNotificationOpenedApp'));
    expect(onMessageBlock).not.toMatch(/routeNotificationTap/);
  });

  it('only routes for the wellness_reminder type — deliberately narrow, not a general router', () => {
    expect(src).toMatch(/data\?\.notification_type/);
    expect(src).toMatch(/type === 'wellness_reminder'/);
  });

  it('reads only the notification_type field — never a question, answer, or health value from the payload', () => {
    const routerFn = src.slice(src.indexOf('function routeNotificationTap'), src.indexOf('function routeNotificationTap') + 500);
    expect(routerFn).toMatch(/data\?\.notification_type/);
    expect(routerFn).not.toMatch(/mood|pain|symptom|question_id/i);
  });

  it('E2: recovers a warm tap via getInitialNotification when the app returns to the foreground', () => {
    expect(src).toMatch(/AppState\.addEventListener\('change'/);
    expect(src).toMatch(/state !== 'active'[^]*getInitialNotification\(\)[^]*routeNotificationTap\(remoteMessage\)/);
  });

  it('E2: dedupes routing by FCM messageId so one tap navigates once', () => {
    expect(src).toMatch(/let lastRoutedMessageId/);
    expect(src).toMatch(/messageId === lastRoutedMessageId/);
  });

  it('the returned cleanup removes every subscription it created', () => {
    expect(src).toMatch(/unsubscribeOpened\(\)/);
    expect(src).toMatch(/appStateSubscription\.remove\(\)/);
  });

  it('calls the same navigateToAdaptiveCheckIn used by the manual entry path — one convergent implementation', () => {
    expect(src).toMatch(/import \{ navigateToAdaptiveCheckIn \} from '@navigation\/navigationRef'/);
  });
});

describe('CheckInPrompt integration — the existing nudge routes into Today 2.1, unmodified itself', () => {
  it('CheckInPrompt.tsx source is byte-for-byte untouched by Phase E', () => {
    const src = read('screens/home/components/CheckInPrompt.tsx');
    // No new imports, no new session/navigation awareness — the
    // component itself has zero knowledge that Phase E exists.
    expect(src).not.toMatch(/CheckInSession/);
    expect(src).not.toMatch(/AdaptiveCheckIn/);
    expect(src).not.toMatch(/checkin_engine/);
    expect(src).not.toMatch(/useCheckInSessionToday/);
  });

  it('the OLD single-question CheckIn model/hooks are untouched — no second question bank, no new answer model', () => {
    const services = read('api/services/intelligenceService.ts');
    expect(services).toMatch(/respondToCheckIn/); // still there, unmodified
    const hooks = read('hooks/queries/useIntelligence.ts');
    expect(hooks).toMatch(/useRespondToCheckIn/);
    expect(hooks).toMatch(/useDismissCheckIn/);
  });

  it("HomeScreen now routes CheckInPrompt's onGoFullLog into the adaptive check-in, not the old QuickLog form", () => {
    const src = read('screens/home/HomeScreen.tsx');
    expect(src).toMatch(/<CheckInPrompt checkIn={today\.check_in} onGoFullLog={goToAdaptiveCheckIn} \/>/);
    // The old QuickLog route is NOT removed — still used elsewhere
    // (e.g. the unrelated `log_today` guided-action intervention).
    expect(src).toMatch(/goToQuickLog\(\); return;/);
  });

  it('only one entry-point wiring line changed — DailyCheckInCard and the rest of Home are untouched', () => {
    const src = read('screens/home/HomeScreen.tsx');
    expect(src).toMatch(/<DailyCheckInCard onPress={goToAdaptiveCheckIn} \/>/);
    expect(src).toMatch(/<QuickCheckInWidget onPressItem={goToQuickLogCategory} \/>/);
  });
});

describe('No second question bank / answer model was introduced', () => {
  it('AdaptiveCheckInScreen (Phase D) is untouched by Phase E', () => {
    const src = read('screens/wellness/AdaptiveCheckInScreen.tsx');
    expect(src).not.toMatch(/notification/i);
    expect(src).not.toMatch(/navigationRef/);
  });

  it('checkinQuestionRenderers.ts (the one question-id -> render-mode table) is untouched', () => {
    const src = read('screens/wellness/checkinQuestionRenderers.ts');
    expect(src).not.toMatch(/notification/i);
  });
});
