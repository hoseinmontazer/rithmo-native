/**
 * What the user recorded TODAY, as plain words - the visible half of the
 * check-in loop ("my answer became part of my day").
 *
 * Pure and deterministic. It only ever words values the backend reports in
 * `state.today_values` (which the backend fills ONLY for fields the user
 * actually reported - never a model default) and the structured
 * `continuity` comparison the backend computed. It never infers a value,
 * never judges ("good sleep"), and returns nothing for a dimension that was
 * not recorded.
 */
import { toFa } from '@utils/persian';
import type { ContinuityPayload } from '../../types/intelligence.types';

export type TodayRecordedKey = 'mood' | 'energy' | 'sleep' | 'pain' | 'stress' | 'symptoms';

export interface TodayRecordedItem {
  key: TodayRecordedKey;
  label: string;
  value: string;
}

const MOOD_WORDS: Record<number, string> = { 1: 'سنگین', 2: 'کمی بد', 3: 'معمولی', 4: 'خوب', 5: 'عالی' };

// The check-in stores its five options as 2/4/6/8/10 (energy, stress) and
// 0/3/5/8/10 (pain); the Quick Log slider stores any 0-10 value. Buckets
// below put every stored value on the same words the check-in itself used.
function energyWord(v: number): string {
  if (v <= 2) { return 'بی‌حال'; }
  if (v <= 4) { return 'کم'; }
  if (v <= 6) { return 'متوسط'; }
  if (v <= 8) { return 'خوب'; }
  return 'پرانرژی';
}

function painWord(v: number): string {
  if (v <= 0) { return 'بدون درد'; }
  if (v <= 3) { return 'کم'; }
  if (v <= 5) { return 'متوسط'; }
  if (v <= 8) { return 'زیاد'; }
  return 'خیلی زیاد';
}

function stressWord(v: number): string {
  if (v <= 2) { return 'خیلی کم'; }
  if (v <= 4) { return 'کم'; }
  if (v <= 6) { return 'متوسط'; }
  if (v <= 8) { return 'زیاد'; }
  return 'خیلی زیاد';
}

function hoursWord(v: number): string {
  const rounded = Math.round(v * 2) / 2;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${toFa(text)} ساعت`;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function buildTodayRecorded(
  values: Record<string, number> | null | undefined,
  symptoms: string[] | null | undefined,
): TodayRecordedItem[] {
  const v = values ?? {};
  const items: TodayRecordedItem[] = [];

  if (isNum(v.mood)) {
    const word = MOOD_WORDS[Math.round(v.mood)];
    if (word) { items.push({ key: 'mood', label: 'حال‌وهوا', value: word }); }
  }
  if (isNum(v.energy) && v.energy >= 0 && v.energy <= 10) {
    items.push({ key: 'energy', label: 'انرژی', value: energyWord(v.energy) });
  }
  if (isNum(v.sleep) && v.sleep > 0 && v.sleep <= 24) {
    items.push({ key: 'sleep', label: 'خواب', value: hoursWord(v.sleep) });
  }
  if (isNum(v.pain) && v.pain >= 0 && v.pain <= 10) {
    items.push({ key: 'pain', label: 'درد', value: painWord(v.pain) });
  }
  if (isNum(v.stress) && v.stress >= 0 && v.stress <= 10) {
    items.push({ key: 'stress', label: 'استرس', value: stressWord(v.stress) });
  }
  const count = (symptoms ?? []).length;
  if (count > 0) {
    items.push({ key: 'symptoms', label: 'علائم', value: `${toFa(count)} مورد` });
  }
  return items;
}

const CONTINUITY_FA: Record<string, { up: string; down: string }> = {
  mood: { up: 'حال‌وهوات امروز نسبت به دیروز بهتره.', down: 'حال‌وهوات امروز نسبت به دیروز پایین‌تره.' },
  energy: { up: 'انرژی‌ات امروز نسبت به دیروز بالاتره.', down: 'انرژی‌ات امروز نسبت به دیروز پایین‌تره.' },
  pain: { up: 'دردت امروز نسبت به دیروز بیشتره.', down: 'دردت امروز نسبت به دیروز کمتره.' },
  sleep: { up: 'خوابی که ثبت کردی نسبت به دیروز بیشتره.', down: 'خوابی که ثبت کردی نسبت به دیروز کمتره.' },
  stress: { up: 'استرست امروز نسبت به دیروز بیشتره.', down: 'استرست امروز نسبت به دیروز کمتره.' },
};

/** One sentence built from the backend's structured comparison, or null. */
export function continuityLine(c: ContinuityPayload | null | undefined): string | null {
  if (!c) { return null; }
  const words = CONTINUITY_FA[c.signal];
  if (!words) { return null; }
  if (c.direction === 'up') { return words.up; }
  if (c.direction === 'down') { return words.down; }
  return null;
}
