/**
 * Mirrors /api/user/reproductive-goal/ (user_profile.views.ReproductiveGoalView).
 *
 *   GET    -> { goal: ReproductiveGoal | null, choices: ReproductiveGoal[] }
 *   PUT    -> { goal } in, same payload out (400 on an unknown value)
 *   DELETE -> same payload out, goal === null
 *   403    -> partner / male accounts (owner-only)
 *
 * `null` means "never chosen, or removed". `'unsure'` is an explicit choice
 * ("prefer not to say") and is NOT the same thing. The goal is a sensitive,
 * user-chosen context flag: it is never inferred, and it appears in no
 * analytics property, log line, partner payload or AI context.
 */
export type ReproductiveGoal =
  | 'track_cycle'
  | 'trying_to_conceive'
  | 'avoid_pregnancy'
  | 'unsure';

export interface ReproductiveGoalPayload {
  goal: ReproductiveGoal | null;
  choices: ReproductiveGoal[];
}
