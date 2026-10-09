/**
 * Guided actions are issued once per day and then frozen, so an action that
 * was right when the plan was issued ("log today") can still be on Home after
 * the user has just done exactly that. Telling someone to record today right
 * after the check-in recorded it is the one place Home visibly contradicts
 * itself, so that single action is hidden once today has anything recorded.
 * Every other action is left alone.
 */
import type { GuidedAction } from '../../types/intelligence.types';

interface RecordedToday {
  today_values?: Record<string, number> | null;
  today_symptoms?: string[] | null;
}

export function hasRecordedToday(state: RecordedToday | null | undefined): boolean {
  if (!state) { return false; }
  return Object.keys(state.today_values ?? {}).length > 0 || (state.today_symptoms ?? []).length > 0;
}

export function visibleActions(
  actions: GuidedAction[] | null | undefined,
  state: RecordedToday | null | undefined,
): GuidedAction[] {
  const all = actions ?? [];
  if (!hasRecordedToday(state)) { return all; }
  return all.filter((a) => a.intervention !== 'log_today');
}
