export interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  sex: 'female' | 'male' | 'other';
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

export interface PartnerInfo {
  id: string;
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
