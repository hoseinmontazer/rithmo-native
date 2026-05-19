import { apiClient } from '@api/client';
import { API_ENDPOINTS } from '@constants/config';
import type {
  Notification,
  UnreadNotificationsResponse,
  CreateNotificationRequest,
  UpdateNotificationRequest,
  NotificationPreferences,
  PushToken,
  RegisterPushTokenRequest,
  UpdatePushTokenRequest,
  Message,
  SendMessageRequest,
  UpdateMessageRequest,
  UnreadMessagesResponse,
} from '@types/notification.types';

export const notificationService = {
  // ── Notifications ─────────────────────────────────────────────────────────
  listNotifications: () =>
    apiClient.get<Notification[]>(API_ENDPOINTS.NOTIFICATIONS),

  getUnread: () =>
    apiClient.get<UnreadNotificationsResponse>(API_ENDPOINTS.NOTIFICATIONS_UNREAD),

  createNotification: (data: CreateNotificationRequest) =>
    apiClient.post<Notification>(API_ENDPOINTS.NOTIFICATIONS, data),

  getNotification: (id: number) =>
    apiClient.get<Notification>(`${API_ENDPOINTS.NOTIFICATIONS}${id}/`),

  markRead: (id: number) =>
    apiClient.post<void>(`${API_ENDPOINTS.NOTIFICATIONS}${id}/mark_read/`),

  markAllRead: () =>
    apiClient.post<void>(API_ENDPOINTS.NOTIFICATIONS_MARK_ALL_READ),

  updateNotification: (id: number, data: UpdateNotificationRequest) =>
    apiClient.put<Notification>(`${API_ENDPOINTS.NOTIFICATIONS}${id}/`, data),

  deleteNotification: (id: number) =>
    apiClient.delete<void>(`${API_ENDPOINTS.NOTIFICATIONS}${id}/`),

  generateSmartNotifications: () =>
    apiClient.post<void>(API_ENDPOINTS.GENERATE_NOTIFICATIONS),

  // ── Preferences ───────────────────────────────────────────────────────────
  getPreferences: () =>
    apiClient.get<NotificationPreferences>(API_ENDPOINTS.NOTIFICATIONS_PREFERENCES),

  savePreferences: (data: Partial<NotificationPreferences>) =>
    apiClient.post<NotificationPreferences>(API_ENDPOINTS.NOTIFICATIONS_PREFERENCES, data),

  updatePreferences: (data: Partial<NotificationPreferences>) =>
    apiClient.put<NotificationPreferences>(
      API_ENDPOINTS.NOTIFICATIONS_PREFERENCES_UPDATE,
      data,
    ),

  // ── Push Tokens ───────────────────────────────────────────────────────────
  listPushTokens: () =>
    apiClient.get<PushToken[]>(API_ENDPOINTS.PUSH_TOKENS),

  registerPushToken: (data: RegisterPushTokenRequest) =>
    apiClient.post<PushToken>(API_ENDPOINTS.PUSH_TOKENS, data),

  getPushToken: (id: number) =>
    apiClient.get<PushToken>(`${API_ENDPOINTS.PUSH_TOKENS}${id}/`),

  updatePushToken: (id: number, data: UpdatePushTokenRequest) =>
    apiClient.put<PushToken>(`${API_ENDPOINTS.PUSH_TOKENS}${id}/`, data),

  deletePushToken: (id: number) =>
    apiClient.delete<void>(`${API_ENDPOINTS.PUSH_TOKENS}${id}/`),

  // ── Messages ──────────────────────────────────────────────────────────────
  listMessages: () =>
    apiClient.get<Message[]>(API_ENDPOINTS.MESSAGES),

  sendMessage: (data: SendMessageRequest) =>
    apiClient.post<Message>(API_ENDPOINTS.MESSAGES, data),

  getConversation: (partnerId: string) =>
    apiClient.get<Message[]>(API_ENDPOINTS.MESSAGES_CONVERSATION, {
      params: { partner_id: partnerId },
    }),

  getUnreadMessages: () =>
    apiClient.get<UnreadMessagesResponse>(API_ENDPOINTS.MESSAGES_UNREAD),

  getMessage: (id: number) =>
    apiClient.get<Message>(`${API_ENDPOINTS.MESSAGES}${id}/`),

  updateMessage: (id: number, data: UpdateMessageRequest) =>
    apiClient.put<Message>(`${API_ENDPOINTS.MESSAGES}${id}/`, data),

  deleteMessage: (id: number) =>
    apiClient.delete<void>(`${API_ENDPOINTS.MESSAGES}${id}/`),
};
