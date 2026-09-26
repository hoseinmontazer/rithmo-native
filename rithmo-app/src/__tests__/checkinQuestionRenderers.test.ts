/**
 * Today 2.1 Phase D — checkinQuestionRenderers.ts.
 *
 * This is the one place mobile code makes a per-question-id decision,
 * and it is a RENDERING decision (which control paints this question),
 * never a branching one (what comes next stays 100% server-driven — see
 * checkinSessionContract.test.ts's "no domain-logic duplication"
 * checks). Real unit tests, not source-scanning, since this module is
 * genuinely pure exported logic with no RN/native dependency.
 */
// Relative import, not the `@screens` alias — jest.config.js's
// moduleNameMapper deliberately only maps aliases pure-logic tests need
// (@utils, @constants, @api, ...); screens/components are never imported
// under Jest (this project verifies rendering on-device — see
// contextEntryContract.test.ts). This one module is the sole exception:
// genuinely pure, zero-RN-dependency logic that happens to live under
// screens/wellness/ alongside the component that uses it.
import { isKnownCheckInQuestion, renderModeForQuestion } from '../screens/wellness/checkinQuestionRenderers';

// The full, approved 13-question bank (intelligence/domain/checkin_engine.py
// QUESTION_BANK) — kept as a literal list here (not imported, this is a
// mobile-only TS module) so a change to either side is a visible diff,
// not a silent mismatch.
const ALL_QUESTION_IDS = [
  'Q_OVERALL', 'Q_POSITIVE_WHAT', 'Q_ANYTHING_UNUSUAL', 'Q_DIMENSION',
  'Q_ENERGY', 'Q_PAIN_SEVERITY', 'Q_PAIN_NEW_OR_RECURRING', 'Q_SLEEP',
  'Q_STRESS', 'Q_SYMPTOM', 'Q_SYMPTOM_NEW', 'Q_CONTEXT', 'Q_ANYTHING_ELSE',
];

describe('renderModeForQuestion', () => {
  it('maps every one of the 13 approved question ids to a known render mode', () => {
    const validModes = new Set([
      'single_select', 'multi_select_symptom', 'single_select_context',
      'numeric_sleep', 'free_text',
    ]);
    ALL_QUESTION_IDS.forEach((id) => {
      expect(validModes.has(renderModeForQuestion(id))).toBe(true);
    });
  });

  it('server returns a single-select question -> single_select render mode (no other question id involved)', () => {
    expect(renderModeForQuestion('Q_OVERALL')).toBe('single_select');
    expect(renderModeForQuestion('Q_DIMENSION')).toBe('single_select');
    expect(renderModeForQuestion('Q_PAIN_SEVERITY')).toBe('single_select');
  });

  it('server returns the multi-select symptom question -> multi_select_symptom render mode', () => {
    expect(renderModeForQuestion('Q_SYMPTOM')).toBe('multi_select_symptom');
  });

  it('server returns the context question -> single_select_context render mode', () => {
    expect(renderModeForQuestion('Q_CONTEXT')).toBe('single_select_context');
  });

  it('server returns the sleep question -> numeric_sleep render mode', () => {
    expect(renderModeForQuestion('Q_SLEEP')).toBe('numeric_sleep');
  });

  it('server returns the free-text question -> free_text render mode', () => {
    expect(renderModeForQuestion('Q_ANYTHING_ELSE')).toBe('free_text');
  });

  it('fails loudly (throws) for an unmapped question id rather than silently rendering a fallback control', () => {
    expect(() => renderModeForQuestion('Q_SOMETHING_NEW_NOT_YET_APPROVED')).toThrow();
  });
});

describe('isKnownCheckInQuestion', () => {
  it('is true for every approved question id', () => {
    ALL_QUESTION_IDS.forEach((id) => expect(isKnownCheckInQuestion(id)).toBe(true));
  });

  it('is false for an unknown id', () => {
    expect(isKnownCheckInQuestion('Q_NOT_REAL')).toBe(false);
  });
});
