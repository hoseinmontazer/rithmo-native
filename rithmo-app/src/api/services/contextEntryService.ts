import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type {
  ContextEntry,
  ContextEntryApiResponse,
  CreateContextEntryRequest,
  UpdateContextEntryRequest,
} from '@types/contextEntry.types';

function unwrap<T>(r: { data: ContextEntryApiResponse<T> }): T {
  return r.data.data as T;
}

export const contextEntryService = {
  listByDate: (date: string) =>
    apiClient
      .get(API_ENDPOINTS.CONTEXT_ENTRIES, { params: { date } })
      .then((r) => unwrap<ContextEntry[]>(r) ?? []),

  create: (data: CreateContextEntryRequest) =>
    apiClient
      .post(API_ENDPOINTS.CONTEXT_ENTRIES, data)
      .then((r) => unwrap<ContextEntry>(r)),

  update: (id: number, data: UpdateContextEntryRequest) =>
    apiClient
      .patch(`${API_ENDPOINTS.CONTEXT_ENTRIES}${id}/`, data)
      .then((r) => unwrap<ContextEntry>(r)),

  delete: (id: number) =>
    apiClient.delete<void>(`${API_ENDPOINTS.CONTEXT_ENTRIES}${id}/`),
};
