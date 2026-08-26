export type NotificationType = 'system' | 'period' | 'ovulation' | 'wellness' | 'partner';

export interface Notification {
  id: number;
  notification_type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface UnreadNotificationsResponse {
  count: number;
  notifications: Notification[];
}

export interface CreateNotificationRequest {
  notification_type: NotificationType;
  title: string;
  message: string;
}

export type UpdateNotificationRequest = Partial<CreateNotificationRequest> & {
  is_read?: boolean;
};

export interface NotificationPreferences {
  email_period_reminder: boolean;
  email_ovulation: boolean;
  email_partner_message: boolean;
  email_wellness_reminder: boolean;
  push_period_reminder: boolean;
  push_ovulation: boolean;
  push_partner_message: boolean;
  push_wellness_reminder: boolean;
  inapp_period_reminder: boolean;
  inapp_ovulation: boolean;
  inapp_partner_message: boolean;
  inapp_wellness_reminder: boolean;
  reminder_days_before: number;
  reminder_time: string;
}

export type DeviceType = 'android' | 'ios' | 'web';

export interface PushToken {
  id: number;
  device_type: DeviceType;
  token: string;
  is_active: boolean;
  created_at: string;
}

export interface RegisterPushTokenRequest {
  device_type: DeviceType;
  token: string;
}

export type UpdatePushTokenRequest = Partial<RegisterPushTokenRequest> & {
  is_active?: boolean;
};

export interface Message {
  id: number;
  /**
   * Django FK primary keys. DRF serializes these as NUMBERS, not strings —
   * the previous `string` annotation was wrong, and the resulting
   * number-vs-string mismatch crashed the conversation list (`.slice` on a
   * number) and made every `sender === userId` check silently false.
   * Always compare and index these via `String(...)`.
   */
  sender: string | number;
  receiver: string | number;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface SendMessageRequest {
  receiver: string;
  message: string;
}

export type UpdateMessageRequest = Partial<SendMessageRequest> & {
  is_read?: boolean;
};

export interface UnreadMessagesResponse {
  count: number;
  messages: Message[];
}

/**
 * `GET /api/notifications/messages/conversation/` response.
 *
 * Deliberately named and exported: the endpoint returns this envelope rather
 * than a bare `Message[]`, and mistaking the two left the chat thread blank.
 */
export interface ConversationResponse {
  count: number;
  messages: Message[];
}
