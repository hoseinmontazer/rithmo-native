import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { medicationService } from '@api/services/medicationService';
import { queryKeys } from '@api/queryKeys';
import type {
  MedicationDrugRequest,
  MedicationLogRequest,
  MedicationReminderRequest,
  MedicationTypeRequest,
  UserMedicationRequest,
} from '@types/medication.types';

/*
 * `medicationService` already unwraps every response — it returns `T[]` for
 * lists and `T` for single objects, exactly as its own header comment says.
 *
 * These hooks had not been updated to match. Every one of them still read
 * `.data` off that already-unwrapped value, so a list query evaluated
 * `normalizeListResponse(undefined)` -> `undefined.results` and threw a
 * TypeError on success responses. React Query retried three times and then
 * parked the query in an error state, and MedicationsScreen only ever checked
 * `isLoading`, so the screen showed a spinner that never resolved. Every
 * medication read AND every medication mutation was affected: the feature
 * could not work at all.
 *
 * Verified on device before the fix: `listUserMedications` resolved to a real
 * array (`[]`) while `response.data` was `undefined`, three attempts in a row.
 *
 * The service is the single unwrapping boundary; hooks consume its result
 * directly. `PaginatedResponse` normalisation lives in `unwrapList` there.
 */

export function useMedicationTypes() {
  return useQuery({
    queryKey: queryKeys.medications.types(),
    queryFn: () => medicationService.listTypes(),
  });
}

export function useMedicationType(id: number) {
  return useQuery({
    queryKey: queryKeys.medications.type(id),
    queryFn: () => medicationService.getType(id),
    enabled: id > 0,
  });
}

export function useMedicationDrugs() {
  return useQuery({
    queryKey: queryKeys.medications.drugs(),
    queryFn: () => medicationService.listDrugs(),
  });
}

export function useMedicationDrug(id: number) {
  return useQuery({
    queryKey: queryKeys.medications.drug(id),
    queryFn: () => medicationService.getDrug(id),
    enabled: id > 0,
  });
}

export function useMedicationDrugSearch(q: string) {
  return useQuery({
    queryKey: queryKeys.medications.drugSearch(q),
    queryFn: () => medicationService.searchDrugs(q),
    enabled: q.trim().length > 0,
  });
}

export function useUserMedications() {
  return useQuery({
    queryKey: queryKeys.medications.userMedications(),
    queryFn: async () => {
      try {
        return await medicationService.listUserMedications();
      } catch (error: any) {
        // 404 means no medications yet - return empty array
        if (error?.response?.status === 404) {
          return [];
        }
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) {return false;}
      return failureCount < 2;
    },
  });
}

export function useUserMedication(id: number) {
  return useQuery({
    queryKey: queryKeys.medications.userMedication(id),
    queryFn: () => medicationService.getUserMedication(id),
    enabled: id > 0,
  });
}

export function useMedicationLogs() {
  return useQuery({
    queryKey: queryKeys.medications.logs(),
    queryFn: () => medicationService.listLogs(),
  });
}

export function useMedicationLog(id: number) {
  return useQuery({
    queryKey: queryKeys.medications.log(id),
    queryFn: () => medicationService.getLog(id),
    enabled: id > 0,
  });
}

export function useMedicationReminders() {
  return useQuery({
    queryKey: queryKeys.medications.reminders(),
    queryFn: () => medicationService.listReminders(),
  });
}

export function useMedicationReminder(id: number) {
  return useQuery({
    queryKey: queryKeys.medications.reminder(id),
    queryFn: () => medicationService.getReminder(id),
    enabled: id > 0,
  });
}

export function useCreateMedicationType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MedicationTypeRequest) =>
      medicationService.createType(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.medications.types() }),
  });
}

export function useUpdateMedicationType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MedicationTypeRequest }) =>
      medicationService.updateType(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.medications.types() }),
  });
}

export function useDeleteMedicationType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => medicationService.deleteType(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.medications.types() }),
  });
}

export function useCreateMedicationDrug() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MedicationDrugRequest) =>
      medicationService.createDrug(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.medications.drugs() }),
  });
}

export function useUpdateMedicationDrug() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MedicationDrugRequest }) =>
      medicationService.updateDrug(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.medications.drugs() }),
  });
}

export function useDeleteMedicationDrug() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => medicationService.deleteDrug(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.medications.drugs() }),
  });
}

export function useCreateUserMedication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UserMedicationRequest) =>
      medicationService.createUserMedication(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.medications.userMedications() }),
  });
}

export function useUpdateUserMedication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserMedicationRequest }) =>
      medicationService.updateUserMedication(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.medications.userMedications() }),
  });
}

export function useDeleteUserMedication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => medicationService.deleteUserMedication(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.medications.userMedications() }),
  });
}

export function useCreateMedicationLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MedicationLogRequest) =>
      medicationService.createLog(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.medications.logs() }),
  });
}

export function useUpdateMedicationLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MedicationLogRequest }) =>
      medicationService.updateLog(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.medications.logs() }),
  });
}

export function useDeleteMedicationLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => medicationService.deleteLog(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.medications.logs() }),
  });
}

export function useCreateMedicationReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MedicationReminderRequest) =>
      medicationService.createReminder(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.medications.reminders() }),
  });
}

export function useUpdateMedicationReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MedicationReminderRequest }) =>
      medicationService.updateReminder(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.medications.reminders() }),
  });
}

export function useDeleteMedicationReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => medicationService.deleteReminder(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.medications.reminders() }),
  });
}
