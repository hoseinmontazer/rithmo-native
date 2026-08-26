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
  /**
   * The server rotates refresh tokens (`ROTATE_REFRESH_TOKENS`), so a refresh
   * returns a NEW refresh token and blacklists the one that was presented
   * (`BLACKLIST_AFTER_ROTATION`). Callers must persist this; keeping the old
   * one means the next refresh presents a blacklisted token.
   *
   * Optional because a server with rotation disabled omits it.
   */
  refresh?: string;
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
