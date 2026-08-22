/**
 * Symptom vocabulary — the client half of the server's canonical list.
 *
 * Mirrors `cycle_tracker/utils/symptoms.py`. The server stores stable ASCII
 * codes and returns them in `symptom_codes`; this maps them to the Persian
 * labels the user actually reads.
 *
 * Two screens used to keep their own private lists — QuickLog collected raw
 * Persian display strings while LogPeriod collected English slugs — and the
 * daily ones were discarded by the API entirely. Now that they persist, the
 * app must send and read the same codes the pattern engine groups by, or
 * "سردرد" logged today and "headache" logged last month would count as two
 * unrelated symptoms.
 *
 * The server still accepts Persian labels (it normalises them), so older
 * installed builds keep working; new writes should send codes.
 */

export interface SymptomOption {
  code: string;
  label: string;
  emoji: string;
}

/** Curated vocabulary, in the order the pickers should show it. */
export const SYMPTOMS: readonly SymptomOption[] = [
  { code: 'cramps', label: 'گرفتگی', emoji: '🌀' },
  { code: 'headache', label: 'سردرد', emoji: '🤕' },
  { code: 'fatigue', label: 'خستگی', emoji: '😮‍💨' },
  { code: 'bloating', label: 'نفخ', emoji: '💧' },
  { code: 'backache', label: 'کمردرد', emoji: '🫃' },
  { code: 'breast_tenderness', label: 'حساسیت سینه', emoji: '🌸' },
  { code: 'insomnia', label: 'بی‌خوابی', emoji: '🌙' },
  { code: 'anxiety', label: 'اضطراب', emoji: '🫀' },
  { code: 'mood_swings', label: 'نوسان خلق', emoji: '🌩️' },
  { code: 'irritability', label: 'تحریک‌پذیری', emoji: '⚡' },
  { code: 'nausea', label: 'تهوع', emoji: '🤢' },
  { code: 'dizziness', label: 'سرگیجه', emoji: '💫' },
  { code: 'cravings', label: 'ولع غذایی', emoji: '🍫' },
  { code: 'acne', label: 'جوش پوستی', emoji: '🔴' },
  { code: 'spotting', label: 'لکه‌بینی', emoji: '🩸' },
] as const;

/** The subset shown in the fast daily log — the most commonly reported. */
export const QUICK_SYMPTOMS: readonly SymptomOption[] = SYMPTOMS.slice(0, 8);

const BY_CODE = new Map(SYMPTOMS.map((s) => [s.code, s]));
/**
 * Reverse lookup so a Persian label written by an older build (or by
 * `Period.symptoms`) still resolves to its code on the way in.
 */
const BY_LABEL = new Map(SYMPTOMS.map((s) => [s.label, s.code]));

/** Persian label for a code, falling back to the code itself. */
export function symptomLabel(code: string): string {
  return BY_CODE.get(code)?.label ?? code;
}

export function symptomEmoji(code: string): string {
  return BY_CODE.get(code)?.emoji ?? '🔸';
}

/**
 * Normalise anything the app might be holding — a code, a Persian label, or
 * a legacy space-separated slug — into a canonical code.
 */
export function toSymptomCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) { return ''; }
  if (BY_CODE.has(trimmed)) { return trimmed; }
  const byLabel = BY_LABEL.get(trimmed);
  if (byLabel) { return byLabel; }
  return trimmed.toLowerCase().replace(/\s+/g, '_');
}

/** Parse a comma-separated wire value into de-duplicated codes. */
export function parseSymptomCodes(value: string | null | undefined): string[] {
  if (!value) { return []; }
  const out: string[] = [];
  for (const part of value.split(',')) {
    const code = toSymptomCode(part);
    if (code && !out.includes(code)) { out.push(code); }
  }
  return out;
}
