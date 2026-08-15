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

/**
 * The medications endpoints return a plain array (no DRF pagination is
 * configured for them server-side) but the types allowed for a paginated
 * shape too, and every call site used to just hand back the raw
 * AxiosResponse instead of its .data — meaning any caller that tried to
 * use these functions "normally" (as `medicationService.listDrugs()` ->
 * `MedicationDrug[]`) would actually get an AxiosResponse object. This
 * mirrors wellnessService's unwrap() so the exported functions resolve to
 * the actual typed payload, matching how every other service in this app
 * is called.
 */
function unwrapList<T>(data: T[] | PaginatedResponse<T>): T[] {
  return Array.isArray(data) ? data : data?.results ?? [];
}

export const medicationService = {
  // ── Medication Types ──────────────────────────────────────────────────────
  listTypes: () =>
    apiClient
      .get<MedicationType[] | PaginatedResponse<MedicationType>>(API_ENDPOINTS.MEDICATION_TYPES)
      .then((r) => unwrapList(r.data)),

  createType: (data: MedicationTypeRequest) =>
    apiClient.post<MedicationType>(API_ENDPOINTS.MEDICATION_TYPES, data).then((r) => r.data),

  getType: (id: number) =>
    apiClient.get<MedicationType>(`${API_ENDPOINTS.MEDICATION_TYPES}${id}/`).then((r) => r.data),

  updateType: (id: number, data: MedicationTypeRequest) =>
    apiClient.put<MedicationType>(`${API_ENDPOINTS.MEDICATION_TYPES}${id}/`, data).then((r) => r.data),

  deleteType: (id: number) =>
    apiClient.delete<void>(`${API_ENDPOINTS.MEDICATION_TYPES}${id}/`),

  // ── Medication Drugs ──────────────────────────────────────────────────────
  listDrugs: () =>
    apiClient
      .get<MedicationDrug[] | PaginatedResponse<MedicationDrug>>(API_ENDPOINTS.MEDICATION_DRUGS)
      .then((r) => unwrapList(r.data)),

  createDrug: (data: MedicationDrugRequest) =>
    apiClient.post<MedicationDrug>(API_ENDPOINTS.MEDICATION_DRUGS, data).then((r) => r.data),

  getDrug: (id: number) =>
    apiClient.get<MedicationDrug>(`${API_ENDPOINTS.MEDICATION_DRUGS}${id}/`).then((r) => r.data),

  searchDrugs: (q: string) =>
    apiClient
      .get<MedicationDrug[] | PaginatedResponse<MedicationDrug>>(API_ENDPOINTS.MEDICATION_DRUG_SEARCH, {
        params: { q },
      })
      .then((r) => unwrapList(r.data)),

  updateDrug: (id: number, data: MedicationDrugRequest) =>
    apiClient.put<MedicationDrug>(`${API_ENDPOINTS.MEDICATION_DRUGS}${id}/`, data).then((r) => r.data),

  deleteDrug: (id: number) =>
    apiClient.delete<void>(`${API_ENDPOINTS.MEDICATION_DRUGS}${id}/`),

  // ── User Medications ──────────────────────────────────────────────────────
  listUserMedications: () =>
    apiClient
      .get<UserMedication[] | PaginatedResponse<UserMedication>>(API_ENDPOINTS.USER_MEDICATIONS)
      .then((r) => unwrapList(r.data)),

  createUserMedication: (data: UserMedicationRequest) =>
    apiClient.post<UserMedication>(API_ENDPOINTS.USER_MEDICATIONS, data).then((r) => r.data),

  getUserMedication: (id: number) =>
    apiClient.get<UserMedication>(`${API_ENDPOINTS.USER_MEDICATIONS}${id}/`).then((r) => r.data),

  updateUserMedication: (id: number, data: UserMedicationRequest) =>
    apiClient.put<UserMedication>(`${API_ENDPOINTS.USER_MEDICATIONS}${id}/`, data).then((r) => r.data),

  deleteUserMedication: (id: number) =>
    apiClient.delete<void>(`${API_ENDPOINTS.USER_MEDICATIONS}${id}/`),

  // ── Medication Logs ───────────────────────────────────────────────────────
  listLogs: () =>
    apiClient
      .get<MedicationLog[] | PaginatedResponse<MedicationLog>>(API_ENDPOINTS.MEDICATION_LOGS)
      .then((r) => unwrapList(r.data)),

  createLog: (data: MedicationLogRequest) =>
    apiClient.post<MedicationLog>(API_ENDPOINTS.MEDICATION_LOGS, data).then((r) => r.data),

  getLog: (id: number) =>
    apiClient.get<MedicationLog>(`${API_ENDPOINTS.MEDICATION_LOGS}${id}/`).then((r) => r.data),

  updateLog: (id: number, data: MedicationLogRequest) =>
    apiClient.put<MedicationLog>(`${API_ENDPOINTS.MEDICATION_LOGS}${id}/`, data).then((r) => r.data),

  deleteLog: (id: number) =>
    apiClient.delete<void>(`${API_ENDPOINTS.MEDICATION_LOGS}${id}/`),

  // ── Medication Reminders ──────────────────────────────────────────────────
  listReminders: () =>
    apiClient
      .get<MedicationReminder[] | PaginatedResponse<MedicationReminder>>(API_ENDPOINTS.MEDICATION_REMINDERS)
      .then((r) => unwrapList(r.data)),

  createReminder: (data: MedicationReminderRequest) =>
    apiClient.post<MedicationReminder>(API_ENDPOINTS.MEDICATION_REMINDERS, data).then((r) => r.data),

  getReminder: (id: number) =>
    apiClient.get<MedicationReminder>(`${API_ENDPOINTS.MEDICATION_REMINDERS}${id}/`).then((r) => r.data),

  updateReminder: (id: number, data: MedicationReminderRequest) =>
    apiClient.put<MedicationReminder>(`${API_ENDPOINTS.MEDICATION_REMINDERS}${id}/`, data).then((r) => r.data),

  deleteReminder: (id: number) =>
    apiClient.delete<void>(`${API_ENDPOINTS.MEDICATION_REMINDERS}${id}/`),
};
