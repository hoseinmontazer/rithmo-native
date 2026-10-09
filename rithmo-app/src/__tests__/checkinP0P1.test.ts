/**
 * Check-in P0/P1 (mobile side): honest completion acknowledgement, the shared
 * Today Feedback entry, truthful prompt copy, and the late/overdue phase fix.
 */
import { canOfferTodayFeedback, checkInAcknowledgement } from '../screens/wellness/checkinAcknowledgement';
import { displayPhase, phaseDescription, phasePlainLabel } from '../i18n';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('checkInAcknowledgement', () => {
  it('names only what was recorded, deterministically', () => {
    expect(checkInAcknowledgement({ recorded: ['mood'], has_log_today: true })).toBe('حال‌وهوا ثبت شد.');
    expect(checkInAcknowledgement({ recorded: ['energy', 'mood'], has_log_today: true })).toBe('حال‌وهوا و انرژی ثبت شد.');
    expect(checkInAcknowledgement({ recorded: ['mood', 'energy', 'pain'], has_log_today: true }))
      .toBe('حال‌وهوا، انرژی و درد ثبت شد.');
  });

  it('is honest when nothing was recorded (prefer-not-to-say / all skipped)', () => {
    expect(checkInAcknowledgement({ recorded: [], has_log_today: false })).toMatch(/چیزی برای ثبت نبود/);
    expect(checkInAcknowledgement(undefined)).toMatch(/چیزی برای ثبت نبود/);
  });

  it('never promises analysis, plan changes or medical meaning', () => {
    const text = [
      checkInAcknowledgement({ recorded: ['mood', 'pain', 'symptoms'], has_log_today: true }),
      checkInAcknowledgement(undefined),
    ].join(' ');
    expect(text).not.toMatch(/تحلیل|برنامه|تشخیص|لحاظ/);
  });

  it('offers Today Feedback only when today has a log', () => {
    expect(canOfferTodayFeedback({ recorded: ['mood'], has_log_today: true })).toBe(true);
    expect(canOfferTodayFeedback({ recorded: [], has_log_today: false })).toBe(false);
    expect(canOfferTodayFeedback(undefined)).toBe(false);
  });
});

describe('completion screen wiring', () => {
  const src = read('screens/wellness/AdaptiveCheckInScreen.tsx');
  it('reuses the shared Today Feedback block, gated, never auto-requesting', () => {
    expect(src).toMatch(/canOfferTodayFeedback\(session\.summary\)\s*&&\s*<TodayFeedbackBlock/);
    expect(src).not.toMatch(/requestFeedback\(/);
  });
  it('the shared block fires only on a user tap', () => {
    const block = read('components/TodayFeedbackBlock.tsx');
    expect(block).toMatch(/onPress=\{\(\) => requestFeedback\(\)\}/);
    expect(block).not.toMatch(/useEffect/);
  });
  it('dropped the old static thank-you', () => {
    expect(src).not.toMatch(/مرسی که امروزت رو ثبت کردی/);
  });
});

describe('truthful prompt copy', () => {
  it('no longer claims the answer will be factored into analysis', () => {
    const src = read('screens/home/components/CheckInPrompt.tsx');
    expect(src).not.toMatch(/در تحلیل بعدی لحاظ/);
    expect(src).toMatch(/ممنون، ثبت شد/);
  });
});

describe('late / overdue phase is never shown as unknown', () => {
  it('lifecycle phase wins over an "unknown" pattern_phase', () => {
    expect(displayPhase('late', 'unknown')).toBe('late');
    expect(displayPhase('overdue', 'unknown')).toBe('overdue');
    expect(displayPhase('expected', 'unknown')).toBe('expected');
    expect(phasePlainLabel(displayPhase('late', 'unknown'))).toBe('دوره با تأخیر');
    expect(phasePlainLabel(displayPhase('overdue', 'unknown'))).toBe('دوره عقب‌افتاده');
    expect(phaseDescription(displayPhase('late', 'unknown'), 35, -3)).toMatch(/۳ روز دیرتر/);
  });

  it('keeps existing behaviour for ordinary phases and genuine unknowns', () => {
    expect(displayPhase('luteal', 'luteal')).toBe('luteal');
    expect(displayPhase('unknown', 'follicular')).toBe('follicular');
    expect(displayPhase('unknown', 'unknown')).toBe('unknown');
    expect(displayPhase(null, null)).toBeNull();
    expect(phasePlainLabel(displayPhase('unknown', 'unknown'))).toBe('نامشخص');
  });

  it('both cycle surfaces use the helper', () => {
    expect(read('screens/home/components/HeroRingCard.tsx')).not.toMatch(/pattern_phase \|\|/);
    expect(read('screens/home/components/CycleContextStrip.tsx')).toMatch(/displayPhase\(/);
  });
});

describe('check-in screen freshness', () => {
  it('re-asks the server whenever the screen regains focus (it is never unmounted)', () => {
    const src = read('screens/wellness/AdaptiveCheckInScreen.tsx');
    expect(src).toMatch(/useFocusEffect\(/);
    expect(src).toMatch(/if \(!submitAnswer\.isPending\) \{ refetch\(\); \}/);
  });
});
