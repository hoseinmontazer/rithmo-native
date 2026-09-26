/**
 * Today 2.1 Phase D — adaptive check-in mobile wiring contract.
 *
 * Source-scanning technique (this project verifies component rendering
 * on-device, not in Jest — see contextEntryContract.test.ts's own
 * header comment), same convention as every other contract test here.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

import { API_ENDPOINTS } from '@constants/config';

const SRC = path.join(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

describe('Check-in session endpoints', () => {
  it('are defined and match the backend routes', () => {
    expect(API_ENDPOINTS.CHECKIN_SESSION_TODAY).toBe('/api/intelligence/checkin-session/today/');
    expect(API_ENDPOINTS.CHECKIN_SESSION_ANSWER).toBe('/api/intelligence/checkin-session/answer/');
  });

  it('are deliberately distinct from the older, unrelated single-question CheckIn nudge endpoints', () => {
    expect(API_ENDPOINTS.CHECKIN_SESSION_TODAY).not.toBe(API_ENDPOINTS.INTELLIGENCE_CHECKIN);
  });

  it('the service calls GET for today and POST for answer', () => {
    const src = read('api/services/checkinSessionService.ts');
    expect(src).toMatch(/apiClient[^]*\.get\(API_ENDPOINTS\.CHECKIN_SESSION_TODAY/);
    expect(src).toMatch(/apiClient[^]*\.post\(API_ENDPOINTS\.CHECKIN_SESSION_ANSWER/);
  });
});

describe('useCheckInSession hooks', () => {
  const src = read('hooks/queries/useCheckInSession.ts');

  it('the session query is not cached stale (server-authoritative, staleTime 0)', () => {
    expect(src).toMatch(/staleTime:\s*0/);
  });

  it('a successful answer seeds the session cache directly from the response', () => {
    expect(src).toMatch(/queryClient\.setQueryData\(queryKeys\.checkinSession\.today\(\), data\)/);
  });

  it('completion triggers narrow, targeted cache invalidation — not a broad refetch-everything', () => {
    expect(src).toMatch(/if \(data\.completed\)/);
    expect(src).toMatch(/queryKeys\.wellness\.today\(\)/);
    expect(src).toMatch(/queryKeys\.wellness\.all\(\)/);
    expect(src).toMatch(/queryKeys\.contextEntries\.all\(\)/);
    expect(src).toMatch(/queryKeys\.intelligence\.today\(\)/);
  });

  it('exposes a way to detect the one error the caller must react to specially (stale question, HTTP 409)', () => {
    expect(src).toMatch(/isStaleQuestionError/);
    expect(src).toMatch(/response\?\.status === 409/);
  });

  it('exposes a reconciliation path that adopts the server state instead of retrying blindly', () => {
    expect(src).toMatch(/useReconcileCheckInSession/);
    expect(src).toMatch(/checkinSessionService\.getToday\(\)/);
  });
});

describe('AdaptiveCheckInScreen — server-authoritative, no domain-logic duplication', () => {
  const src = read('screens/wellness/AdaptiveCheckInScreen.tsx');

  it('fetches the server session and never constructs a question locally', () => {
    expect(src).toMatch(/useCheckInSessionToday/);
    // Real code patterns only — the screen's own module docstring
    // mentions checkin_engine.py by name to EXPLAIN this boundary, which
    // would itself match a bare substring check; look for an actual
    // call/import instead of banning the word.
    expect(src).not.toMatch(/getNextQuestion\(/);
    expect(src).not.toMatch(/from ['"].*checkin_engine['"]/);
  });

  it('renders whichever question id the server returned via the pure render-mode mapping only', () => {
    expect(src).toMatch(/renderModeForQuestion\(question\.id\)/);
  });

  it('does not hardcode branching logic (no "if this question then that question" comparisons)', () => {
    // The only per-question-id comparisons allowed in this file are
    // against the render-mode CONSTANT strings ('single_select', etc) —
    // never against a question id used to decide what comes next.
    expect(src).not.toMatch(/question\.id\s*===\s*['"]Q_[A-Z_]+['"]/);
    expect(src).not.toMatch(/if\s*\(.*mood.*(bad|good|pain)/i);
  });

  it('submits the answer via the mutation and never optimistically renders a guessed next question', () => {
    expect(src).toMatch(/useSubmitCheckInAnswer/);
    expect(src).toMatch(/submitAnswer\.mutate/);
  });

  it('guards against duplicate taps while a submission is in flight', () => {
    expect(src).toMatch(/if \(submitting\) \{ return; \}/);
    expect(src).toMatch(/submitAnswer\.isPending/);
  });

  it('reconciles (does not error-loop) on a stale-question response', () => {
    expect(src).toMatch(/isStaleQuestionError\(err\)/);
    expect(src).toMatch(/reconcile\(\)/);
  });

  it('renders the honest question count, never a fixed-length progress bar', () => {
    expect(src).toMatch(/session\.question_number/);
    expect(src).not.toMatch(/ProgressBar/i);
  });

  it('every skippable question exposes a skip affordance that never auto-invents a value', () => {
    expect(src).toMatch(/question\.can_skip/);
    expect(src).toMatch(/submitSkip/);
    expect(src).toMatch(/skip:\s*true/);
  });

  it('shows a completed state (not a silent redirect) when the server reports completion', () => {
    expect(src).toMatch(/session\.completed/);
    expect(src).toMatch(/ثبت شد/);
  });

  it('handles the initial-load error state with retry, and does not lose the session on network failure', () => {
    expect(src).toMatch(/isError \|\| !session/);
    expect(src).toMatch(/onRetry={refetch}/);
  });

  it('leaving the screen (close/back) does not invent an abandon action — it just navigates back', () => {
    expect(src).toMatch(/navigation\.goBack\(\)/);
    // No confirm-to-leave dialog and no status mutation (e.g. an
    // "abandon" API call/state) on close — only real code patterns are
    // checked here, since the screen's own comments explain (in prose)
    // why no such action exists, which would itself match a bare
    // substring ban.
    expect(src).not.toMatch(/Alert\.alert/);
    expect(src).not.toMatch(/status:\s*['"]abandoned['"]/);
    expect(src).not.toMatch(/submitAnswer\.mutate\([^)]*abandon/i);
  });

  it('resets local per-question draft state whenever the server current question id changes', () => {
    expect(src).toMatch(/useEffect\(\(\) => \{[^]*\}, \[currentQuestionId\]\)/);
  });
});

describe('AdaptiveCheckIn entry point on Today', () => {
  it('registers exactly one new route, distinct from QuickLog/LogWellness', () => {
    const types = read('navigation/types.ts');
    expect(types).toMatch(/AdaptiveCheckIn:\s*undefined/);
  });

  it('is wired into WellnessStack', () => {
    const stack = read('navigation/stacks/WellnessStack.tsx');
    expect(stack).toMatch(/name="AdaptiveCheckIn"/);
    expect(stack).toMatch(/component={AdaptiveCheckInScreen}/);
  });

  it('HomeScreen adds one new entry card without removing QuickCheckInWidget or CheckInPrompt', () => {
    const home = read('screens/home/HomeScreen.tsx');
    expect(home).toMatch(/<DailyCheckInCard onPress={goToAdaptiveCheckIn} \/>/);
    // Both pre-existing entry points remain untouched as components —
    // CheckInPrompt's onGoFullLog wiring was deliberately redirected onto
    // Today 2.1 in Phase E (see checkinNotificationContract.test.ts),
    // which is not a regression of this Phase D assertion but the
    // intended integration Phase E's own brief required.
    expect(home).toMatch(/<QuickCheckInWidget onPressItem={goToQuickLogCategory} \/>/);
    expect(home).toMatch(/<CheckInPrompt checkIn={today\.check_in} onGoFullLog={goToAdaptiveCheckIn} \/>/);
  });

  it('the entry card navigates into the WellnessStack, not a competing standalone flow', () => {
    const home = read('screens/home/HomeScreen.tsx');
    expect(home).toMatch(/goToAdaptiveCheckIn[^]*navigation\.navigate\('LogTab' as any, \{ screen: 'AdaptiveCheckIn' \} as any\)/);
  });
});

describe('CheckInPrompt (the older, unrelated nudge) is untouched', () => {
  it('the component file was not modified by Phase D — no reference to the new session hooks/endpoints', () => {
    const src = read('screens/home/components/CheckInPrompt.tsx');
    expect(src).not.toMatch(/useCheckInSessionToday/);
    expect(src).not.toMatch(/CHECKIN_SESSION/);
    expect(src).not.toMatch(/AdaptiveCheckIn/);
  });
});

describe('Today 2.0 compatibility — existing capture/edit paths untouched', () => {
  it('QuickLogScreen was not modified by Phase D', () => {
    const src = read('screens/wellness/QuickLogScreen.tsx');
    expect(src).not.toMatch(/CHECKIN_SESSION/);
    expect(src).not.toMatch(/useCheckInSessionToday/);
  });

  it('LogWellnessScreen (historical editing) was not modified by Phase D', () => {
    const src = read('screens/wellness/LogWellnessScreen.tsx');
    expect(src).not.toMatch(/CHECKIN_SESSION/);
    expect(src).not.toMatch(/useCheckInSessionToday/);
  });

  it('Today Feedback wiring is untouched', () => {
    const src = read('api/services/todayFeedbackService.ts');
    expect(src).not.toMatch(/CHECKIN_SESSION/);
  });
});
