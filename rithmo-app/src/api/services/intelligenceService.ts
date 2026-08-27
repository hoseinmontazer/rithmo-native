import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type {
  ActionStatus,
  CheckIn,
  GuidedAction,
  Helpfulness,
  Insight,
  PartnerTodayPayload,
  PartnerTodayResponse,
  ProgressPayload,
  TodayPayload,
} from '@types/intelligence.types';

/** Unwrap the `{ status, data }` envelope the Rithmo API returns. */
function unwrap<T>(r: { data: unknown }): T {
  const body = r.data as { status?: string; data?: T } | T;
  if (body && typeof body === 'object' && 'data' in (body as object)) {
    return (body as { data: T }).data;
  }
  return body as T;
}

/**
 * Partner responses carry a meaningful `status` that is NOT an error:
 * `no_partner` and `not_shared` are ordinary states the partner UI must
 * render honestly ("she hasn't shared this") rather than as a failure.
 * So the envelope is returned intact here instead of being unwrapped.
 */
export const intelligenceService = {
  getToday: () =>
    apiClient
      .get(API_ENDPOINTS.INTELLIGENCE_TODAY)
      .then((r) => unwrap<TodayPayload>(r)),

  getInsights: (includeInsufficient = false) =>
    apiClient
      .get(API_ENDPOINTS.INTELLIGENCE_INSIGHTS, {
        params: includeInsufficient ? { include_insufficient: 'true' } : undefined,
      })
      .then((r) => unwrap<{ learning_mode: boolean; insights: Insight[] }>(r)),

  dismissInsight: (key: string) =>
    apiClient
      .post(
        `${API_ENDPOINTS.INTELLIGENCE_INSIGHT_DISMISS}${encodeURIComponent(key)}/dismiss/`,
      )
      .then((r) => unwrap<{ key: string; dismissed: boolean }>(r)),

  setInsightAccuracy: (key: string, accurate: boolean) =>
    apiClient
      .post(
        `${API_ENDPOINTS.INTELLIGENCE_INSIGHT_DISMISS}${encodeURIComponent(key)}/accuracy/`,
        { accurate },
      )
      .then((r) => unwrap<{ key: string; accurate: boolean }>(r)),

  respondToCheckIn: (checkinId: number, value: string) =>
    apiClient
      .post(`${API_ENDPOINTS.INTELLIGENCE_CHECKIN}${checkinId}/respond/`, { value })
      .then((r) => unwrap<CheckIn>(r)),

  dismissCheckIn: (checkinId: number) =>
    apiClient
      .post(`${API_ENDPOINTS.INTELLIGENCE_CHECKIN}${checkinId}/dismiss/`)
      .then((r) => unwrap<CheckIn>(r)),

  submitFeedback: (
    actionId: number,
    status: ActionStatus,
    helpfulness?: Helpfulness,
    note?: string,
  ) =>
    apiClient
      .post(`${API_ENDPOINTS.INTELLIGENCE_ACTIONS}${actionId}/feedback/`, {
        status,
        ...(helpfulness !== undefined ? { helpfulness } : {}),
        ...(note ? { note } : {}),
      })
      .then((r) => unwrap<GuidedAction>(r)),

  getProgress: () =>
    apiClient
      .get(API_ENDPOINTS.INTELLIGENCE_PROGRESS)
      .then((r) => unwrap<ProgressPayload>(r)),

  getPartnerToday: () =>
    apiClient
      .get(API_ENDPOINTS.INTELLIGENCE_PARTNER_TODAY)
      .then((r) => r.data as PartnerTodayResponse),
};

export type { PartnerTodayPayload };
