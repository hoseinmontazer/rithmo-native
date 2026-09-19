import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type { AskRithmoResponse } from '@types/askRithmo.types';

export const askRithmoService = {
  ask: (question: string) =>
    apiClient
      .post<AskRithmoResponse>(API_ENDPOINTS.AI_ASK_RITHMO, { question })
      .then((r) => r.data),
};
