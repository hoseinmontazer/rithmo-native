/**
 * Pure decision logic for what OnboardingScreen persists to the server.
 *
 * Why this is separate and why partner is blocking: the role PATCH used to go
 * straight through profileService (bypassing the React Query cache) with its
 * failure swallowed. RootNavigator has already cached the default
 * `user_role: 'owner'` profile by then, and useRole() lets the server role
 * beat the device-local one, so a partner who chose the partner role got the
 * OWNER app - permanently if the PATCH had failed. So:
 *
 *   - the PATCH response must land in the cache (done by usePatchProfile)
 *   - for 'partner' the PATCH must succeed before onboarding completes
 *   - for 'owner' it stays best-effort (owner is also the default role)
 *
 * The role is exactly what the user chose; it is never inferred from sex.
 */
import type { UpdateProfileRequest } from '@types/profile.types';

export type OnboardingRole = 'owner' | 'partner';

export interface OnboardingAnswers {
  intent: string | null;
  regularity: string | null;
  hasSymptoms: string | null;
}

export function buildOnboardingProfileUpdate(
  role: OnboardingRole,
  answers: OnboardingAnswers,
): UpdateProfileRequest {
  const updates: UpdateProfileRequest = {
    user_role: role,
    onboarding_completed: true,
  };
  if (role === 'owner') {
    if (answers.intent) { updates.onboarding_intent = answers.intent; }
    if (answers.regularity) { updates.onboarding_regularity = answers.regularity; }
    if (answers.hasSymptoms) { updates.onboarding_symptoms = answers.hasSymptoms; }
  }
  return updates;
}

/**
 * Runs the PATCH (`patch` is the cache-applying mutation) and reports whether
 * onboarding may complete. Partner: only if the PATCH succeeded. Owner: always.
 */
export async function persistOnboardingProfile(
  role: OnboardingRole,
  answers: OnboardingAnswers,
  patch: (updates: UpdateProfileRequest) => Promise<unknown>,
): Promise<{ canComplete: boolean }> {
  try {
    await patch(buildOnboardingProfileUpdate(role, answers));
    return { canComplete: true };
  } catch {
    return { canComplete: role !== 'partner' };
  }
}
