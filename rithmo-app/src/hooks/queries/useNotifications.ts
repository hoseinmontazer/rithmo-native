import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@api/services/notificationService';
import { queryKeys } from '@api/queryKeys';
import type {
  NotificationPreferences,
  RegisterPushTokenRequest,
  SendMessageRequest,
  UpdateMessageRequest,
  UpdateNotificationRequest,
  UpdatePushTokenRequest,
} from '@types/notification.types';

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.all(),
    queryFn: () => notificationService.listNotifications().then((r) => r.data),
  });
}

export function useNotification(id: number) {
  return useQuery({
    queryKey: [...queryKeys.notifications.all(), id] as const,
    queryFn: () => notificationService.getNotification(id).then((r) => r.data),
    enabled: id > 0,
  });
}

export function useUnreadNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.unread(),
    queryFn: () => notificationService.getUnread().then((r) => r.data),
    refetchInterval: 60_000, // poll every minute
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
    },
  });
}

export function useUpdateNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateNotificationRequest }) =>
      notificationService.updateNotification(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: queryKeys.notifications.preferences(),
    queryFn: () => notificationService.getPreferences().then((r) => r.data),
  });
}

export function useSaveNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<NotificationPreferences>) =>
      notificationService.savePreferences(data).then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.notifications.preferences(), updated);
    },
  });
}

export function useRegisterPushToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RegisterPushTokenRequest) =>
      notificationService.registerPushToken(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.pushTokens() });
    },
  });
}

export function usePushTokens() {
  return useQuery({
    queryKey: queryKeys.notifications.pushTokens(),
    queryFn: () => notificationService.listPushTokens().then((r) => r.data),
  });
}

export function usePushToken(id: number) {
  return useQuery({
    queryKey: [...queryKeys.notifications.pushTokens(), id] as const,
    queryFn: () => notificationService.getPushToken(id).then((r) => r.data),
    enabled: id > 0,
  });
}

export function useUpdatePushToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePushTokenRequest }) =>
      notificationService.updatePushToken(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.pushTokens() });
    },
  });
}

export function useDeletePushToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationService.deletePushToken(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.pushTokens() });
    },
  });
}

// ── Messages ──────────────────────────────────────────────────────────────────

export function useMessages() {
  return useQuery({
    queryKey: queryKeys.messages.all(),
    queryFn: () => notificationService.listMessages().then((r) => r.data),
  });
}

export function useMessage(id: number) {
  return useQuery({
    queryKey: [...queryKeys.messages.all(), id] as const,
    queryFn: () => notificationService.getMessage(id).then((r) => r.data),
    enabled: id > 0,
  });
}

export function useConversation(partnerId: string) {
  return useQuery({
    queryKey: queryKeys.messages.conversation(partnerId),
    queryFn: () => notificationService.getConversation(partnerId).then((r) => r.data),
    enabled: !!partnerId,
    refetchInterval: 10_000, // poll conversation every 10 s
  });
}

export function useUnreadMessages() {
  return useQuery({
    queryKey: queryKeys.messages.unread(),
    queryFn: () => notificationService.getUnreadMessages().then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SendMessageRequest) =>
      notificationService.sendMessage(data).then((r) => r.data),
    onSuccess: (_msg, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.conversation(variables.receiver),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.all() });
    },
  });
}

export function useUpdateMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMessageRequest }) =>
      notificationService.updateMessage(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.unread() });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationService.deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.unread() });
    },
  });
}
