import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type {
  Ticket,
  TicketCreateRequest,
  TicketReplyRequest,
} from '@types/support.types';

const ticketDetail = (id: number) => `${API_ENDPOINTS.SUPPORT_TICKETS}${id}/`;
const ticketMessages = (id: number) => `${API_ENDPOINTS.SUPPORT_TICKETS}${id}/messages/`;

export const supportService = {
  /** All tickets of the current user (no pagination — plain list). */
  getTickets: () =>
    apiClient.get<Ticket[]>(API_ENDPOINTS.SUPPORT_TICKETS),

  getTicket: (id: number) =>
    apiClient.get<Ticket>(ticketDetail(id)),

  createTicket: (data: TicketCreateRequest) =>
    apiClient.post<Ticket>(API_ENDPOINTS.SUPPORT_TICKETS, data),

  /** Reply to a ticket. Resolved/closed tickets reopen on reply. */
  replyToTicket: (id: number, data: TicketReplyRequest) =>
    apiClient.post<Ticket>(ticketMessages(id), data),
};
