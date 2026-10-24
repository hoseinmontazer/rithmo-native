/**
 * Support ticket types — mirror the /api/support/tickets/ contract.
 * The user-facing API never includes internal operator notes
 * (server strips them in UserTicketSerializer.to_representation).
 */

export type TicketCategory =
  | 'account'
  | 'billing'
  | 'premium'
  | 'partner'
  | 'technical'
  | 'other'
  // Created by the in-app feedback form (source="feedback"); they also appear
  // in the user's own ticket list, so the client must be able to label them.
  | 'ttc'
  | 'avoid_pregnancy'
  | 'cycle_tracking'
  | 'partner_experience'
  | 'pricing';

export type TicketPriority = 'low' | 'normal' | 'high';

export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'awaiting_user'
  | 'resolved'
  | 'closed';

export interface TicketMessage {
  id: number;
  sender_username: string;
  is_internal: boolean;
  body: string;
  created_at: string;
}

export interface Ticket {
  id: number;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  messages: TicketMessage[];
}

export interface TicketCreateRequest {
  subject: string;
  category?: TicketCategory;
  message: string;
}

export interface TicketReplyRequest {
  body: string;
}

/**
 * Mirrors POST /api/support/feedback/ (support.views.ProductFeedbackView).
 *   201 -> { id, duplicate: false }   stored
 *   200 -> { id, duplicate: true }    same topic + text within 24 h; nothing new stored
 *   400 -> { category?: string[], text?: string[], contact_ok?: string[] }
 *   429 -> rate limited (10 / hour)
 */
export type FeedbackTopic =
  | 'ttc'
  | 'avoid_pregnancy'
  | 'cycle_tracking'
  | 'partner_experience'
  | 'pricing'
  | 'other';

export interface FeedbackRequest {
  category: FeedbackTopic;
  text?: string;
  contact_ok?: boolean;
}

export interface FeedbackResponse {
  id: number;
  duplicate: boolean;
}
