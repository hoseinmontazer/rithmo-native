import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type {
  UserProfile,
  UpdateProfileRequest,
  InvitationCode,
  AcceptInvitationRequest,
  RemovePartnerRequest,
} from '@types/profile.types';

export const profileService = {
  getProfile: () =>
    apiClient.get<UserProfile>(API_ENDPOINTS.USER_PROFILE),

  updateProfile: (data: UpdateProfileRequest) =>
    apiClient.put<UserProfile>(API_ENDPOINTS.USER_PROFILE, data),

  patchProfile: (data: Partial<UpdateProfileRequest>) =>
    apiClient.patch<UserProfile>(API_ENDPOINTS.USER_PROFILE, data),

  getInvitationCode: () =>
    apiClient.get<InvitationCode>(API_ENDPOINTS.USER_INVITATION),

  generateInvitationCode: () =>
    apiClient.post<InvitationCode>(API_ENDPOINTS.USER_INVITATION),

  acceptInvitationCode: (data: AcceptInvitationRequest) =>
    apiClient.post<void>(API_ENDPOINTS.USER_INVITATION, data),

  generateRemoveCode: () =>
    apiClient.post<{ remove_code: string }>(API_ENDPOINTS.USER_PARTNER_REMOVE),

  removePartner: (data: RemovePartnerRequest) =>
    apiClient.post<void>(API_ENDPOINTS.USER_PARTNER_REMOVE, data),
};
