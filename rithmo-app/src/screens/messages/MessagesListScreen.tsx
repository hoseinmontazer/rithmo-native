import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { useMessages } from '@hooks/queries/useNotifications';
import { useAuth } from '@hooks/useAuth';
import { LoadingState, ErrorState, EmptyState, Card, Icon } from '@components/ui';
import { formatDate } from '@utils/dateUtils';
import type { Message } from '@types/notification.types';
import type { MessagesScreenProps } from '@navigation/types';

type Props = MessagesScreenProps<'MessagesList'>;

export default function MessagesListScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography } = useTheme();
  const { userId } = useAuth();
  const { data: messages, isLoading, isError, error, refetch } = useMessages();

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Group messages by conversation partner
  const conversations = React.useMemo(() => {
    if (!messages || !userId) {return [];}
    const map = new Map<string, Message>();
    messages.forEach((msg) => {
      const partnerId = msg.sender === userId ? msg.receiver : msg.sender;
      const existing = map.get(partnerId);
      if (!existing || new Date(msg.created_at) > new Date(existing.created_at)) {
        map.set(partnerId, msg);
      }
    });
    return Array.from(map.entries()).map(([partnerId, lastMsg]) => ({ partnerId, lastMsg }));
  }, [messages, userId]);

  const renderItem = useCallback(({ item }: { item: { partnerId: string; lastMsg: Message } }) => {
    const isMine = item.lastMsg.sender === userId;
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('Conversation', { partnerId: item.partnerId, partnerName: `Partner ${item.partnerId.slice(0, 6)}` })}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={'Conversation with partner'}
      >
        <Card style={{ marginBottom: spacing[3] }}>
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryLight, borderRadius: 24 }]}>
              <Text style={{ fontSize: 20 }}>💬</Text>
            </View>
            <View style={[styles.content, { marginLeft: spacing[3] }]}>
              <View style={styles.topRow}>
                <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '600' }}>
                  Partner
                </Text>
                <Text style={{ color: colors.textDisabled, fontSize: typography.xs }}>
                  {formatDate(item.lastMsg.created_at)}
                </Text>
              </View>
              <Text
                style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: 2 }}
                numberOfLines={1}
              >
                {isMine ? 'You: ' : ''}{item.lastMsg.message}
              </Text>
            </View>
            {!item.lastMsg.is_read && !isMine && (
              <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  }, [navigation, userId, colors, spacing, typography]);

  const keyExtractor = useCallback((item: { partnerId: string }) => item.partnerId, []);

  if (isLoading) {return <LoadingState fullScreen message="Loading messages…" />;}
  if (isError)   {return <ErrorState fullScreen error={error} onRetry={refetch} />;}

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ padding: spacing[5] }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: spacing[4] }]}>
            <View>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>Messages</Text>
              <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                Partner inbox
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sm, fontWeight: '600' }}>
                {conversations.length} conversations
              </Text>
            </View>
            <View style={[styles.heroIcon, { backgroundColor: colors.primaryLighter }]}>
              <Icon name="message-text-outline" size={22} color={colors.primaryDark} />
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="💬"
            title="No messages yet"
            description="Link with a partner to start messaging."
          />
        }
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex:      { flex: 1 },
  hero:      { borderRadius: 24, borderWidth: 1, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow:   { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  title:     { fontWeight: '800', letterSpacing: 0, marginBottom: 5 },
  heroIcon:  { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  row:       { flexDirection: 'row', alignItems: 'center' },
  avatar:    { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  content:   { flex: 1 },
  topRow:    { flexDirection: 'row', justifyContent: 'space-between' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
});
