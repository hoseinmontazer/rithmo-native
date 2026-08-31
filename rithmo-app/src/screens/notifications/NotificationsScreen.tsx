import React, { useCallback } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity, Text, RefreshControl,
} from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { textRoles, typography } from '@theme/typography';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@hooks/queries/useNotifications';
import { LoadingState, ErrorState, EmptyState, Icon } from '@components/ui';
import { NotificationItem } from '@components/notifications/NotificationItem';
import { toFa } from '@utils/persian';
import type { Notification } from '@types/notification.types';
import { track } from '@analytics';

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
    track('notification_opened', { notification_type: n.notification_type });
    if (!n.is_read) {markRead(n.id);}
  }, [markRead]);

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationItem notification={item} onPress={handlePress} />
    ),
    [handlePress],
  );

  const keyExtractor = useCallback((item: Notification) => String(item.id), []);

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  if (isLoading) {return <LoadingState fullScreen message="در حال بارگذاری اعلان‌ها…" />;}
  if (isError)   {return <ErrorState fullScreen error={error} onRetry={refetch} />;}

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* A utility surface, not a marketing one. The title was `2xl` (32) —
          the display step, reserved for hero numerals — on a screen whose job
          is to get out of the way. It is `screenTitle` now, and the eyebrow
          above it already says what the screen is. */}
      <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border, margin: spacing[4], marginBottom: spacing[3] }]}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>اعلان‌ها</Text>
          <Text
            style={[
              styles.title,
              {
                color: colors.textPrimary,
                fontSize: textRoles.screenTitle.fontSize,
                lineHeight: textRoles.screenTitle.lineHeight,
              },
            ]}
          >
            به‌روزرسانی‌ها
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: textRoles.bodyCompact.fontSize,
              lineHeight: textRoles.bodyCompact.lineHeight,
              fontWeight: '600',
            }}
          >
            {toFa(unreadCount)} خوانده‌نشده
          </Text>
        </View>
        <View style={styles.heroActions}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primaryLighter }]}>
            <Icon name="bell-outline" size={22} color={colors.primaryDark} />
          </View>
        </View>
      </View>

      {unreadCount > 0 && (
        <View style={[styles.headerRow, { paddingHorizontal: spacing[4], paddingBottom: spacing[1] }]}>
          <TouchableOpacity onPress={() => markAllRead()} accessibilityLabel="خواندن همه">
            <Text style={{ color: colors.primary, fontSize: typography.sm, fontWeight: '600' }}>
              خواندن همه
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{
          paddingHorizontal: screen.gutter,
          paddingTop: screen.top,
          paddingBottom: screen.bottom,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState icon="bell-outline" title="اعلانی نیست" description="همه چیز به‌روز است!" />
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
  eyebrow:   { fontSize: typography.overline, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  // 700 = the screenTitle role. Persian letterforms join, so no tracking.
  title:     { fontWeight: '700', marginBottom: 5 },
  heroActions: { flexDirection: 'row', alignItems: 'center' },
  heroIcon:  { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
});
