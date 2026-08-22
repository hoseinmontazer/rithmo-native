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
  | 'other';

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
