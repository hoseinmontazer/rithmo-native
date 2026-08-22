export interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  sex: 'female' | 'male' | 'other';
  // ── Role architecture ───────────────────────────────────────────────────
  /** Cycle owner (data belongs to them) vs partner (any gender). */
  user_role?: 'owner' | 'partner';
  /** Server-side onboarding flag (set by the onboarding screen). */
  onboarding_completed?: boolean;
  /** Free-text focus areas (e.g. '["sleep","mood"]'). */
  wellness_focus?: string;
  // ── Preferred (editable) ──────────────────────────────────────────────────
  preferred_cycle_length?: number;
  preferred_period_duration?: number;
  // ── Onboarding preferences ────────────────────────────────────────────────
  onboarding_intent?: string;
  onboarding_regularity?: string;
  onboarding_symptoms?: string;
  // ── Legacy / calculated (read-only analytics) ─────────────────────────────
  cycle_length?: number;
  period_duration?: number;
  partners?: PartnerInfo[];
}

/** Owner-side partner sharing controls. Defaults are privacy-friendly. */
export interface ShareSettings {
  share_period_status: boolean;
  share_upcoming_period: boolean;
  share_mood: boolean;
  share_wellness_status: boolean;
}

export interface PartnerInfo {
  /**
   * The linked partner's user id.
   *
   * The API field is `partner_user_id` (see UserProfileSerializer.
   * get_partners). This type previously declared `id`, so every
   * `key={p.id}` in the app evaluated to undefined and React logged a
   * missing-key warning on Home, Profile and PartnerManage. `id` is kept
   * as an optional alias only so older call sites do not break.
   */
  partner_user_id: number;
  id?: number | string;
  username: string;
  email: string;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  sex?: 'female' | 'male' | 'other';
  /** Editable preferred values — PATCH /api/user/profile/ */
  preferred_cycle_length?: number;
  preferred_period_duration?: number;
  onboarding_intent?: string;
  onboarding_regularity?: string;
  onboarding_symptoms?: string;
  // ── Role architecture ───────────────────────────────────────────────────
  user_role?: 'owner' | 'partner';
  onboarding_completed?: boolean;
  wellness_focus?: string;
}

export interface InvitationCode {
  invitation_code: string;
  expires_in: number; // seconds until expiration
}

export interface AcceptInvitationRequest {
  code_to_accept: string;
}

export interface RemovePartnerRequest {
  remove_code: string;
}
