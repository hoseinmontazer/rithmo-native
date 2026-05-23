export interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  sex: 'female' | 'male' | 'other';
  cycle_length: number;
  period_duration: number;
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
  cycle_length?: number;
  period_duration?: number;
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
