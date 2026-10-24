import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type {
  ContraceptionRecord,
  ContraceptionReminder,
  ContraceptionSummary,
  CreateCheckRequest,
  CreateRecordRequest,
  CreateReminderRequest,
  SexualHealthCheck,
} from '@types/reproductiveRecords.types';

interface Envelope<T> {
  status: string;
  data: T;
}

const E = API_ENDPOINTS;

/** PRIVATE records. Every call is the signed-in user's own data on the server. */
export const reproductiveRecordsService = {
  getSummary: () => apiClient.get<Envelope<ContraceptionSummary>>(E.CONTRACEPTION_SUMMARY),

  createRecord: (body: CreateRecordRequest) =>
    apiClient.post<Envelope<ContraceptionRecord>>(E.CONTRACEPTION_RECORDS, body),
  updateRecord: (id: number, body: { started_on?: string; stopped_on?: string | null }) =>
    apiClient.patch<Envelope<ContraceptionRecord>>(`${E.CONTRACEPTION_RECORDS}${id}/`, body),
  deleteRecord: (id: number) => apiClient.delete<Envelope<null>>(`${E.CONTRACEPTION_RECORDS}${id}/`),

  getReminders: () => apiClient.get<Envelope<ContraceptionReminder[]>>(E.CONTRACEPTION_REMINDERS),
  createReminder: (body: CreateReminderRequest) =>
    apiClient.post<Envelope<ContraceptionReminder>>(E.CONTRACEPTION_REMINDERS, body),
  updateReminder: (id: number, body: { is_active?: boolean }) =>
    apiClient.patch<Envelope<ContraceptionReminder>>(`${E.CONTRACEPTION_REMINDERS}${id}/`, body),
  deleteReminder: (id: number) => apiClient.delete<Envelope<null>>(`${E.CONTRACEPTION_REMINDERS}${id}/`),

  getChecks: () => apiClient.get<Envelope<SexualHealthCheck[]>>(E.SEXUAL_HEALTH_CHECKS),
  createCheck: (body: CreateCheckRequest) =>
    apiClient.post<Envelope<SexualHealthCheck>>(E.SEXUAL_HEALTH_CHECKS, body),
  deleteCheck: (id: number) => apiClient.delete<Envelope<null>>(`${E.SEXUAL_HEALTH_CHECKS}${id}/`),
};
