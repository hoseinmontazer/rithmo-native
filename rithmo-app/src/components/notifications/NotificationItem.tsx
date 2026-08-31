import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { faDateShort } from '@utils/persian';
import type { Notification, NotificationType } from '@types/notification.types';

const TYPE_EMOJI: Record<NotificationType, string> = {
  system:   '🔔',
  period:   '●',
  ovulation:'✨',
  wellness: '💚',
  partner:  '💬',
};

interface NotificationItemProps {
  notification: Notification;
  onPress: (n: Notification) => void;
}

export const NotificationItem = memo(function NotificationItem({
  notification,
  onPress,
}: NotificationItemProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={notification.title}
      style={[
        styles.container,
        {
          backgroundColor: notification.is_read ? colors.surface : colors.primaryLight,
          borderRadius: borderRadius.xl,
          padding: spacing[4],
          marginBottom: spacing[2],
          borderWidth: 1,
          borderColor: notification.is_read ? colors.border : colors.primary + '44',
        },
      ]}
    >
      <View style={styles.row}>
        <Text style={{ fontSize: typography.xlarge, marginEnd: spacing[3] }}>
          {TYPE_EMOJI[notification.notification_type]}
        </Text>
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              {
                color: colors.textPrimary,
                fontSize: typography.base,
                fontWeight: notification.is_read ? '400' : '600',
              },
            ]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <Text
            style={[styles.message, { color: colors.textSecondary, fontSize: typography.sm, marginTop: 2 }]}
            numberOfLines={2}
          >
            {notification.message}
          </Text>
          <Text style={[styles.date, { color: colors.textDisabled, fontSize: typography.xs, marginTop: spacing[1] }]}>
            {faDateShort(notification.created_at)}
          </Text>
        </View>

        {!notification.is_read && (
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {},
  row:       { flexDirection: 'row', alignItems: 'flex-start' },
  content:   { flex: 1 },
  title:     {},
  message:   { lineHeight: 18 },
  date:      {},
  dot:       { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginStart: 8 },
});
