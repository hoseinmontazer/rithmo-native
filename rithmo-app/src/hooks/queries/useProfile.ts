import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '@api/services/profileService';
import { queryKeys } from '@api/queryKeys';
import { useAuthStore } from '@store/authStore';
import type { UpdateProfileRequest, AcceptInvitationRequest, RemovePartnerRequest } from '@types/profile.types';

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.all(),
    queryFn: () => profileService.getProfile().then((r) => r.data),
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) =>
      profileService.updateProfile(data).then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.profile.all(), updated);
      // Only sync the fields that exist on AuthUser to avoid type mismatch
      useAuthStore.getState().setUser({
        id:         updated.id,
        username:   updated.username,
        email:      updated.email,
        first_name: updated.first_name,
        last_name:  updated.last_name,
        sex:        updated.sex,
      });
    },
  });
}

export function usePatchProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<UpdateProfileRequest>) =>
      profileService.patchProfile(data).then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.profile.all(), updated);
      // Sync overlapping fields to auth store
      useAuthStore.getState().setUser({
        id:         updated.id,
        username:   updated.username,
        email:      updated.email,
        first_name: updated.first_name,
        last_name:  updated.last_name,
        sex:        updated.sex,
      });
    },
  });
}

export function useInvitationCode() {
  return useQuery({
    queryKey: queryKeys.profile.invitation(),
    queryFn: () => profileService.getInvitationCode().then((r) => r.data),
  });
}

export function useGenerateInvitationCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => profileService.generateInvitationCode().then((r) => r.data),
    onSuccess: (code) => {
      queryClient.setQueryData(queryKeys.profile.invitation(), code);
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AcceptInvitationRequest) =>
      profileService.acceptInvitationCode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all() });
    },
  });
}

export function useGenerateRemoveCode() {
  return useMutation({
    mutationFn: () =>
      profileService.generateRemoveCode().then((r) => r.data),
  });
}

export function useRemovePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RemovePartnerRequest) =>
      profileService.removePartner(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all() });
      useAuthStore.getState().setPartnerId(null);
    },
  });
}
