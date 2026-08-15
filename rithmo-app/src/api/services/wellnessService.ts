import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import { formatDateISO } from '@utils/dateUtils';
import type {
  WellnessLog,
  WellnessAnalytics,
  WellnessStreaks,
  WellnessApiResponse,
  CreateWellnessLogRequest,
  UpdateWellnessLogRequest,
} from '@types/wellness.types';

/**
 * Unwrap the { status, data } envelope the Rithmo wellness API returns.
 *
 * Handles three shapes the server may send:
 *   1. { status: "success", data: <payload> }   → return payload (or null if absent)
 *   2. Plain array / object (no envelope)        → return as-is
 *   3. 404 / empty body                          → return null
 *
 * React Query requires the query function to never return `undefined`,
 * so we always return `null` instead of `undefined`.
 */
function unwrap<T>(r: { data: unknown }): T | null {
  const body = r.data;

  // No body at all
  if (body === undefined || body === null) {return null;}

  // Wrapped envelope: { status, data }
  if (
    typeof body === 'object' &&
    !Array.isArray(body) &&
    'status' in (body as object) &&
    'data' in (body as object)
  ) {
    const payload = (body as WellnessApiResponse<T>).data;
    // payload itself might be null (e.g. no today log)
    return payload ?? null;
  }

  // Plain response (array or object without envelope)
  return (body as T) ?? null;
}

export const wellnessService = {
  listLogs: () =>
    apiClient
      .get(API_ENDPOINTS.WELLNESS)
      .then((r) => unwrap<WellnessLog[]>(r) ?? []),

  createOrUpdateLog: (data: CreateWellnessLogRequest) =>
    // Sends this device's own local calendar date explicitly — the
    // backend used to infer "today" itself from server/UTC time, so an
    // entry logged in the evening in most timezones could silently land
    // on the wrong calendar day from the user's point of view.
    apiClient
      .post(API_ENDPOINTS.WELLNESS, { ...data, date: formatDateISO(new Date()) })
      .then((r) => unwrap<WellnessLog>(r)!),

  getLog: (id: number) =>
    apiClient
      .get(`${API_ENDPOINTS.WELLNESS}${id}/`)
      .then((r) => unwrap<WellnessLog>(r)!),

  updateLog: (id: number, data: UpdateWellnessLogRequest) =>
    apiClient
      .put(`${API_ENDPOINTS.WELLNESS}${id}/`, data)
      .then((r) => unwrap<WellnessLog>(r)!),

  deleteLog: (id: number) =>
    apiClient.delete<void>(`${API_ENDPOINTS.WELLNESS}${id}/`),

  getAnalytics: (days: number = 30) =>
    apiClient
      .get(`${API_ENDPOINTS.WELLNESS_ANALYTICS}?days=${days}`)
      .then((r) => unwrap<WellnessAnalytics>(r)),

  getStreaks: () =>
    apiClient
      .get(API_ENDPOINTS.WELLNESS_STREAKS)
      .then((r) => unwrap<WellnessStreaks>(r)),

  getTodayLog: () =>
    apiClient
      .get(API_ENDPOINTS.WELLNESS_TODAY)
      .then((r) => unwrap<WellnessLog>(r)), // null = no log today, that's valid

  getWeeklySummary: () =>
    apiClient
      .get(API_ENDPOINTS.WELLNESS_WEEKLY_SUMMARY)
      .then((r) => unwrap<unknown>(r)),
};
