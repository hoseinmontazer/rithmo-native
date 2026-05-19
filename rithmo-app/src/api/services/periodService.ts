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
  getCycleAnalysis: (role?: 'partner') =>
    apiClient.get<CycleAnalysis>(API_ENDPOINTS.PERIODS_CYCLE_ANALYSIS, {
      params: role ? { role } : undefined,
    }),

  getCycleInsights: () =>
    apiClient.get<CycleInsights>(API_ENDPOINTS.PERIODS_CYCLE_INSIGHTS),

  getWellnessCorrelation: () =>
    apiClient.get<WellnessCorrelation>(API_ENDPOINTS.PERIODS_WELLNESS_CORRELATION),

  getSymptomPatterns: () =>
    apiClient.get<SymptomPatterns>(API_ENDPOINTS.PERIODS_SYMPTOM_PATTERNS),

  // ── Ovulation ─────────────────────────────────────────────────────────────
  getLatestOvulation: () =>
    apiClient.get<OvulationPrediction>(API_ENDPOINTS.OVULATION),

  getOvulationForPeriod: (periodId: number) =>
    apiClient.get<OvulationPrediction>(`${API_ENDPOINTS.OVULATION}${periodId}/`),
};
