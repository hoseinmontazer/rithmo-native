import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type {
  Period,
  CreatePeriodRequest,
  UpdatePeriodRequest,
  CycleAnalysis,
  CycleInsights,
  WellnessCorrelation,
  SymptomPatterns,
  OvulationPrediction,
} from '@types/period.types';

export const periodService = {
  // ── Periods ──────────────────────────────────────────────────────────────
  listPeriods: (role?: 'partner') =>
    apiClient.get<Period[]>(API_ENDPOINTS.PERIODS, {
      params: role ? { role } : undefined,
    }),

  createPeriod: (data: CreatePeriodRequest) =>
    apiClient.post<Period>(API_ENDPOINTS.PERIODS, data),

  getPeriod: (id: number) =>
    apiClient.get<Period>(`${API_ENDPOINTS.PERIODS}${id}/`),

  updatePeriod: (id: number, data: UpdatePeriodRequest) =>
    apiClient.put<Period>(`${API_ENDPOINTS.PERIODS}${id}/`, data),

  patchPeriod: (id: number, data: Partial<UpdatePeriodRequest>) =>
    apiClient.patch<Period>(`${API_ENDPOINTS.PERIODS}${id}/`, data),

  updateLatestPeriod: (data: UpdatePeriodRequest) =>
    apiClient.patch<Period>(API_ENDPOINTS.PERIODS_UPDATE_LATEST, data),

  deletePeriod: (id: number) =>
    apiClient.delete<void>(`${API_ENDPOINTS.PERIODS}${id}/`),

  // ── Cycle Analysis ────────────────────────────────────────────────────────
  //
  // PERIODS_CYCLE_ANALYSIS / PERIODS_CYCLE_INSIGHTS / OVULATION (the bare
  // "/api/ovulation/") were never real backend routes — cycle_tracker's
  // urls.py only ever registered "analytics/" (AnalyticsViewSet, unified
  // under ?mode=analysis|insights) and there's no top-level "ovulation/"
  // router at all, only AnalyticsViewSet's "ovulation" action nested under
  // "analytics/". Every one of these calls was silently 404ing — caught by
  // the calling hooks' "404 = no data yet" handling, so the failure looked
  // like "no cycle data" instead of a broken request. They now call the
  // endpoints that actually exist.
  getCycleAnalysis: (role?: 'partner') =>
    apiClient.get<CycleAnalysis>(API_ENDPOINTS.ANALYTICS_CYCLE, {
      params: { mode: 'analysis', ...(role ? { role } : {}) },
    }),

  getAnalyticsCycle: (options?: { role?: 'partner'; mode?: 'analysis' }) =>
    apiClient.get<any>(API_ENDPOINTS.ANALYTICS_CYCLE, {
      params: {
        ...(options?.role ? { role: options.role } : {}),
        ...(options?.mode ? { mode: options.mode } : {}),
      },
    }),

  getCycleInsights: (role?: 'partner') =>
    apiClient.get<CycleInsights>(API_ENDPOINTS.ANALYTICS_CYCLE, {
      params: { mode: 'insights', ...(role ? { role } : {}) },
    }),

  // getWellnessCorrelation previously called /api/periods/wellness_correlation/
  // which was never registered in cycle_tracker's urls.py (always 404).
  // It now calls the real, live dashboard endpoint which returns the same
  // WellnessCorrelation shape already typed in period.types.ts.
  getWellnessCorrelation: () =>
    apiClient.get<WellnessCorrelation>(API_ENDPOINTS.DASHBOARD_CORRELATIONS),

  // getSymptomPatterns previously called /api/periods/symptom_patterns/
  // which has no backend implementation anywhere in the codebase.
  // There is no plan to build this server-side in the current roadmap.
  // The function is kept for API compatibility but now returns an empty
  // SymptomPatterns shape so callers never see a 404 — CycleAnalysisScreen
  // guards on patterns?.patterns?.length before rendering the section,
  // so an empty result simply hides the section cleanly.
  getSymptomPatterns: () =>
    Promise.resolve({ data: { message: 'not_implemented', patterns: [] } as unknown as SymptomPatterns }),

  // ── Ovulation ─────────────────────────────────────────────────────────────
  // Backend only exposes "current user's latest-cycle ovulation" — there is
  // no per-period ovulation lookup, so getOvulationForPeriod's periodId is
  // accepted for API-compat but not actually sent anywhere.
  getLatestOvulation: () =>
    apiClient.get<OvulationPrediction>(API_ENDPOINTS.OVULATION),

  getOvulationForPeriod: (_periodId: number) =>
    apiClient.get<OvulationPrediction>(API_ENDPOINTS.OVULATION),
};
