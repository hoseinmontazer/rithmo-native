/**
 * Which part of QuickLog Home's quick check-in chips open it at.
 *
 * Every chip must correspond to something QuickLog really records. The old
 * Water and Weight chips did not (QuickLog has no such input), and the
 * `initialCategory` they sent was never read, so every chip opened the form at
 * the top. A chip now names a section, QuickLog scrolls to it, and a section
 * that does not exist cannot be named.
 */
export type QuickLogFocus = 'mood' | 'energy' | 'symptoms';

/** The sections of QuickLog a chip can open, in the order they appear on the form. */
export const QUICK_LOG_FOCUS_SECTIONS: readonly QuickLogFocus[] = ['mood', 'energy', 'symptoms'];

export function parseQuickLogFocus(value: unknown): QuickLogFocus | null {
  return typeof value === 'string' && (QUICK_LOG_FOCUS_SECTIONS as readonly string[]).includes(value)
    ? (value as QuickLogFocus)
    : null;
}

/** Breathing room kept above a section when it is scrolled to the top. */
export const QUICK_LOG_FOCUS_OFFSET = 8;

/** Scroll position for a section, never above the top of the form. */
export function focusScrollY(sectionY: number): number {
  return Math.max(0, Math.round(sectionY) - QUICK_LOG_FOCUS_OFFSET);
}
