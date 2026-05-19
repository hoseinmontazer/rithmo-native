import React, { useCallback } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity, Text, RefreshControl,
} from 'react-native';
import { useTheme } from '@hooks/useTheme';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@hooks/queries/useNotifications';
import { LoadingState, ErrorState, EmptyState, Icon } from '@components/ui';
import { NotificationItem } from '@components/notifications/NotificationItem';
import type { Notification } from '@types/notification.types';

export default function NotificationsScreen() {
  const { colors, spacing, typography } = useTheme();
  const { data: notifications, isLoading, isError, error, refetch } = useNotifications();
  const { mutate: markRead }    = useMarkNotificationRead();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handlePress = useCallback((n: Notification) => {
    if (!n.is_read) markRead(n.id);
  }, [markRead]);

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationItem notification={item} onPress={handlePress} />
    ),
    [handlePress],
  );

  const keyExtractor = useCallback((item: Notification) => String(item.id), []);

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  if (isLoading) return <LoadingState fullScreen message="Loading notifications…" />;
  if (isError)   return <ErrorState fullScreen error={error} onRetry={refetch} />;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border, margin: spacing[5], marginBottom: spacing[3] }]}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>Notifications</Text>
          <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
            Updates
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, fontWeight: '600' }}>
            {unreadCount} unread
          </Text>
        </View>
        <View style={styles.heroActions}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primaryLighter }]}>
            <Icon name="bell-outline" size={22} color={colors.primaryDark} />
          </View>
        </View>
      </View>

      {unreadCount > 0 && (
        <View style={[styles.headerRow, { paddingHorizontal: spacing[5], paddingBottom: spacing[1] }]}>
          <TouchableOpacity onPress={() => markAllRead()} accessibilityLabel="Mark all as read">
            <Text style={{ color: colors.primary, fontSize: typography.sm, fontWeight: '600' }}>
              Mark all read
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[8] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState icon="🔔" title="No notifications" description="You're all caught up!" />
        }
        removeClippedSubviews
        maxToRenderPerBatch={12}
        windowSize={5}
        initialNumToRender={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex:      { flex: 1 },
  hero:      { borderRadius: 24, borderWidth: 1, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow:   { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  title:     { fontWeight: '800', letterSpacing: 0, marginBottom: 5 },
  heroActions: { flexDirection: 'row', alignItems: 'center' },
  heroIcon:  { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
});
