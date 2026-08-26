/**
 * Not a standalone suite — run both directly (under whatever TZ this
 * machine has) AND spawned as a subprocess under an explicit TZ by
 * `jalali.test.ts`'s "bare calendar-date strings are timezone-safe" block.
 *
 * Jest's node test environment does not reliably react to a *runtime*
 * `process.env.TZ = ...` reassignment (V8/ICU fixes the offset earlier in
 * worker startup), so the only faithful way to prove `faDateShort` is
 * correct under a west-of-UTC device timezone is to actually start a fresh
 * process with `TZ` set before Node boots. This file is that fresh process.
 */
import { faDateShort } from '@utils/persian';

test('a bare YYYY-MM-DD date string resolves to the correct Jalali day under this TZ', () => {
  // 2026-08-21 = ۳۰ مرداد ۱۴۰۵ (see the CASES table in jalali.test.ts).
  // Before the fix, `new Date('2026-08-21')` parsed as UTC midnight, which
  // rendered as ۲۹ مرداد on any device timezone west of UTC.
  expect(faDateShort('2026-08-21')).toBe('۳۰ مرداد');
});
