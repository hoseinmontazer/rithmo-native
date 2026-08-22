import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportService } from '@api/services/supportService';
import { queryKeys } from '@api/queryKeys';
import type { TicketCreateRequest } from '@types/support.types';

export function useTickets() {
  return useQuery({
    queryKey: queryKeys.support.list(),
    queryFn: () => supportService.getTickets().then((r) => r.data),
  });
}

export function useTicket(id: number | null) {
  return useQuery({
    queryKey: queryKeys.support.detail(id ?? 0),
    queryFn: () => supportService.getTicket(id as number).then((r) => r.data),
    enabled: id != null,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TicketCreateRequest) =>
      supportService.createTicket(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.support.all() });
    },
  });
}

export function useReplyToTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, body }: { ticketId: number; body: string }) =>
      supportService.replyToTicket(ticketId, { body }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.support.all() });
    },
  });
}
