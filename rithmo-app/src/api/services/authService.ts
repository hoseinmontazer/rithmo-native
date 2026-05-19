import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ActivateRequest,
  ChangePasswordRequest,
  ResetPasswordRequest,
  ResetPasswordConfirmRequest,
  AuthUser,
} from '@types/auth.types';

export const authService = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>(API_ENDPOINTS.AUTH_LOGIN, data),

  register: (data: RegisterRequest) =>
    apiClient.post<AuthUser>(API_ENDPOINTS.AUTH_REGISTER, data),

  activate: (data: ActivateRequest) =>
    apiClient.post<void>(API_ENDPOINTS.AUTH_ACTIVATE, data),

  getMe: () =>
    apiClient.get<AuthUser>(API_ENDPOINTS.AUTH_ME),

  updateMe: (data: Partial<AuthUser>) =>
    apiClient.put<AuthUser>(API_ENDPOINTS.AUTH_ME, data),

  changePassword: (data: ChangePasswordRequest) =>
    apiClient.post<void>(API_ENDPOINTS.AUTH_SET_PASSWORD, data),

  resetPassword: (data: ResetPasswordRequest) =>
    apiClient.post<void>(API_ENDPOINTS.AUTH_RESET_PASSWORD, data),

  resetPasswordConfirm: (data: ResetPasswordConfirmRequest) =>
    apiClient.post<void>(API_ENDPOINTS.AUTH_RESET_PASSWORD_CONFIRM, data),

  deleteAccount: (currentPassword: string) =>
    apiClient.delete<void>(API_ENDPOINTS.AUTH_ME, {
      data: { current_password: currentPassword },
    }),
};
