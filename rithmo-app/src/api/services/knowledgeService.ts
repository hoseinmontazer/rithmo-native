import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';

/**
 * One knowledge item as returned by the backend — see
 * subscriptions... no, knowledge/serializers.py's serialize_item_summary/
 * serialize_item_detail (rithmo-backend). claim_strength/evidence_type
 * are premium-only additions — absent for a free user's response, not
 * empty strings, so callers must check for `undefined`, not falsy.
 */
export interface KnowledgeItemSummary {
  id: number;
  category: string;
  topic: string;
  title_fa: string;
  short_summary_fa: string;
  evidence_level: 'A' | 'B' | 'C';
  source_name: string;
  source_url: string;
  published_at: string | null;
  knowledge_updated_at: string;
  personalized_reason_fa: string | null;
  is_premium_item: boolean;
  saved: boolean;
  dismissed: boolean;
  claim_strength?: 'established_guidance' | 'association' | 'possibility';
  evidence_type?: string;
}

export interface KnowledgeItemDetail extends KnowledgeItemSummary {
  body_fa?: string;
  locked: boolean;
}

export interface KnowledgeTodayResponse {
  items: KnowledgeItemSummary[];
  quota: { used_today: number; limit: number; is_premium: boolean };
}

export interface KnowledgeHistoryResponse {
  today: KnowledgeItemSummary[];
  this_week: KnowledgeItemSummary[];
  saved: KnowledgeItemSummary[];
  history_window_days: number;
  truncated: boolean;
}

export const knowledgeService = {
  getToday: () =>
    apiClient.get<KnowledgeTodayResponse>(API_ENDPOINTS.KNOWLEDGE_TODAY),

  getHistory: () =>
    apiClient.get<KnowledgeHistoryResponse>(API_ENDPOINTS.KNOWLEDGE_HISTORY),

  getDetail: (itemId: number) =>
    apiClient.get<KnowledgeItemDetail>(`${API_ENDPOINTS.KNOWLEDGE_BASE}${itemId}/`),

  save: (itemId: number) =>
    apiClient.post<{ saved: boolean }>(`${API_ENDPOINTS.KNOWLEDGE_BASE}${itemId}/save/`),

  dismiss: (itemId: number) =>
    apiClient.post<{ dismissed: boolean }>(`${API_ENDPOINTS.KNOWLEDGE_BASE}${itemId}/dismiss/`),

  sendFeedback: (itemId: number, value: 'helpful' | 'not_relevant') =>
    apiClient.post<{ feedback: string }>(`${API_ENDPOINTS.KNOWLEDGE_BASE}${itemId}/feedback/`, { value }),
};
