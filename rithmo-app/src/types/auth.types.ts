export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user_id?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  re_password: string;
  sex: 'female' | 'male' | 'other';
}

export interface ActivateRequest {
  uid: string;
  token: string;
}

export interface RefreshTokenRequest {
  refresh: string;
}

export interface RefreshTokenResponse {
  access: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  re_new_password: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordConfirmRequest {
  uid: string;
  token: string;
  new_password: string;
  re_new_password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  sex?: 'female' | 'male' | 'other';
}

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  userId?: string;
}
