import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type {
  MedicationDrug,
  MedicationDrugRequest,
  MedicationLog,
  MedicationLogRequest,
  MedicationReminder,
  MedicationReminderRequest,
  MedicationType,
  MedicationTypeRequest,
  UserMedication,
  UserMedicationRequest,
} from '@types/medication.types';
import type { PaginatedResponse } from '@types/api.types';

export const medicationService = {
  // ── Medication Types ──────────────────────────────────────────────────────
  listTypes: () =>
    apiClient.get<MedicationType[] | PaginatedResponse<MedicationType>>(API_ENDPOINTS.MEDICATION_TYPES),

  createType: (data: MedicationTypeRequest) =>
    apiClient.post<MedicationType>(API_ENDPOINTS.MEDICATION_TYPES, data),

  getType: (id: number) =>
    apiClient.get<MedicationType>(`${API_ENDPOINTS.MEDICATION_TYPES}${id}/`),

  updateType: (id: number, data: MedicationTypeRequest) =>
    apiClient.put<MedicationType>(`${API_ENDPOINTS.MEDICATION_TYPES}${id}/`, data),

  deleteType: (id: number) =>
    apiClient.delete<void>(`${API_ENDPOINTS.MEDICATION_TYPES}${id}/`),

  // ── Medication Drugs ──────────────────────────────────────────────────────
  listDrugs: () =>
    apiClient.get<MedicationDrug[] | PaginatedResponse<MedicationDrug>>(API_ENDPOINTS.MEDICATION_DRUGS),

  createDrug: (data: MedicationDrugRequest) =>
    apiClient.post<MedicationDrug>(API_ENDPOINTS.MEDICATION_DRUGS, data),

  getDrug: (id: number) =>
    apiClient.get<MedicationDrug>(`${API_ENDPOINTS.MEDICATION_DRUGS}${id}/`),

  searchDrugs: (q: string) =>
    apiClient.get<MedicationDrug[] | PaginatedResponse<MedicationDrug>>(API_ENDPOINTS.MEDICATION_DRUG_SEARCH, {
      params: { q },
    }),

  updateDrug: (id: number, data: MedicationDrugRequest) =>
    apiClient.put<MedicationDrug>(`${API_ENDPOINTS.MEDICATION_DRUGS}${id}/`, data),

  deleteDrug: (id: number) =>
    apiClient.delete<void>(`${API_ENDPOINTS.MEDICATION_DRUGS}${id}/`),

  // ── User Medications ──────────────────────────────────────────────────────
  listUserMedications: () =>
    apiClient.get<UserMedication[] | PaginatedResponse<UserMedication>>(API_ENDPOINTS.USER_MEDICATIONS),

  createUserMedication: (data: UserMedicationRequest) =>
    apiClient.post<UserMedication>(API_ENDPOINTS.USER_MEDICATIONS, data),

  getUserMedication: (id: number) =>
    apiClient.get<UserMedication>(`${API_ENDPOINTS.USER_MEDICATIONS}${id}/`),

  updateUserMedication: (id: number, data: UserMedicationRequest) =>
    apiClient.put<UserMedication>(`${API_ENDPOINTS.USER_MEDICATIONS}${id}/`, data),

  deleteUserMedication: (id: number) =>
    apiClient.delete<void>(`${API_ENDPOINTS.USER_MEDICATIONS}${id}/`),

  // ── Medication Logs ───────────────────────────────────────────────────────
  listLogs: () =>
    apiClient.get<MedicationLog[] | PaginatedResponse<MedicationLog>>(API_ENDPOINTS.MEDICATION_LOGS),

  createLog: (data: MedicationLogRequest) =>
    apiClient.post<MedicationLog>(API_ENDPOINTS.MEDICATION_LOGS, data),

  getLog: (id: number) =>
    apiClient.get<MedicationLog>(`${API_ENDPOINTS.MEDICATION_LOGS}${id}/`),

  updateLog: (id: number, data: MedicationLogRequest) =>
    apiClient.put<MedicationLog>(`${API_ENDPOINTS.MEDICATION_LOGS}${id}/`, data),

  deleteLog: (id: number) =>
    apiClient.delete<void>(`${API_ENDPOINTS.MEDICATION_LOGS}${id}/`),

  // ── Medication Reminders ──────────────────────────────────────────────────
  listReminders: () =>
    apiClient.get<MedicationReminder[] | PaginatedResponse<MedicationReminder>>(API_ENDPOINTS.MEDICATION_REMINDERS),

  createReminder: (data: MedicationReminderRequest) =>
    apiClient.post<MedicationReminder>(API_ENDPOINTS.MEDICATION_REMINDERS, data),

  getReminder: (id: number) =>
    apiClient.get<MedicationReminder>(`${API_ENDPOINTS.MEDICATION_REMINDERS}${id}/`),

  updateReminder: (id: number, data: MedicationReminderRequest) =>
    apiClient.put<MedicationReminder>(`${API_ENDPOINTS.MEDICATION_REMINDERS}${id}/`, data),

  deleteReminder: (id: number) =>
    apiClient.delete<void>(`${API_ENDPOINTS.MEDICATION_REMINDERS}${id}/`),
};
