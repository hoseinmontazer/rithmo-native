import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { ACTION_ICONS, ICON_SIZE } from '@design-system/iconography';
import { useMessages } from '@hooks/queries/useNotifications';
import { useProfile } from '@hooks/queries/useProfile';
import { useAuth } from '@hooks/useAuth';
import { LoadingState, ErrorState, EmptyState, Card, Icon } from '@components/ui';
import { faDateShort, toFa } from '@utils/persian';
import type { Message } from '@types/notification.types';
import type { MessagesScreenProps } from '@navigation/types';

type Props = MessagesScreenProps<'MessagesList'>;

export default function MessagesListScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography } = useTheme();
  const { userId } = useAuth();
  const { data: messages, isLoading, isError, error, refetch } = useMessages();
  const { data: profile } = useProfile();

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Build a partnerId→displayName map from profile.partners so we never
  // show the truncated-ID placeholder ("Partner ab12ef") to the user.
  const partnerNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    (profile?.partners ?? []).forEach((p: any) => {
      // `partner_user_id` is what UserProfileSerializer.get_partners emits.
      // This read `p.id ?? p.user_id`, neither of which exists on that
      // payload, so the map was always empty and every row fell through to
      // the truncated-ID placeholder this block exists to avoid.
      const id = String(p.partner_user_id ?? p.id ?? p.user_id ?? '');
      const name =
        [p.first_name, p.last_name].filter(Boolean).join(' ').trim() ||
        p.username ||
        p.email ||
        `شریک ${id.slice(0, 6)}`;
      if (id) { map.set(id, name); }
    });
    return map;
  }, [profile]);

  /**
   * The linked partner, if any — used to offer a first conversation.
   *
   * The list below is derived from existing messages, so with a fresh link and
   * no history there was nothing to tap: the empty state told an
   * already-linked user to "link with a partner", and the first message could
   * never be sent from the UI at all.
   */
  const linkedPartner = React.useMemo(() => {
    const first = (profile?.partners ?? [])[0] as any;
    if (!first) { return null; }
    const id = String(first.partner_user_id ?? first.id ?? first.user_id ?? '');
    return id ? { id } : null;
  }, [profile]);

  const resolvePartnerName = useCallback(
    // `String(...)` on both sides: these ids arrive from DRF as numbers, so
    // the map (keyed by string) always missed and the placeholder then called
    // `.slice` on a number — "undefined is not a function", inside the
    // FlatList cell renderer.
    (partnerId: string | number) => {
      const key = String(partnerId);
      return partnerNameMap.get(key) ?? `شریک ${key.slice(0, 6)}`;
    },
    [partnerNameMap],
  );

  // Group messages by conversation partner
  const conversations = React.useMemo(() => {
    if (!messages || !userId) {return [];}
    const map = new Map<string, Message>();
    const me = String(userId);
    messages.forEach((msg) => {
      // Compared as strings — `msg.sender === userId` was a number/string
      // strict comparison, so it was always false and the "other side" of
      // every conversation was resolved to the wrong participant.
      const partnerId = String(msg.sender) === me ? String(msg.receiver) : String(msg.sender);
      const existing = map.get(partnerId);
      if (!existing || new Date(msg.created_at) > new Date(existing.created_at)) {
        map.set(partnerId, msg);
      }
    });
    return Array.from(map.entries()).map(([partnerId, lastMsg]) => ({ partnerId, lastMsg }));
  }, [messages, userId]);

  const renderItem = useCallback(({ item }: { item: { partnerId: string; lastMsg: Message } }) => {
    const isMine = String(item.lastMsg.sender) === String(userId);
    const partnerName = resolvePartnerName(item.partnerId);
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('Conversation', { partnerId: item.partnerId, partnerName })}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`گفتگو با ${partnerName}`}
      >
        <Card style={{ marginBottom: spacing[3] }}>
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryLight, borderRadius: 24 }]}>
              <Icon name={ACTION_ICONS.messages} size={ICON_SIZE.sm} color={colors.primary} />
            </View>
            <View style={[styles.content, { marginLeft: spacing[3] }]}>
              <View style={styles.topRow}>
                <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '600' }}>
                  {partnerName}
                </Text>
                <Text style={{ color: colors.textDisabled, fontSize: typography.xs }}>
                  {faDateShort(item.lastMsg.created_at)}
                </Text>
              </View>
              <Text
                style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: 2 }}
                numberOfLines={1}
              >
                {isMine ? 'تو: ' : ''}{item.lastMsg.message}
              </Text>
            </View>
            {!item.lastMsg.is_read && !isMine && (
              <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  }, [navigation, userId, colors, spacing, typography, resolvePartnerName]);

  const keyExtractor = useCallback((item: { partnerId: string }) => item.partnerId, []);

  if (isLoading) {return <LoadingState fullScreen message="در حال بارگذاری پیام‌ها…" />;}
  if (isError)   {return <ErrorState fullScreen error={error} onRetry={refetch} />;}

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{
          paddingHorizontal: screen.gutter,
          paddingTop: screen.top,
          paddingBottom: screen.bottom,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: spacing[4] }]}>
            <View>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>پیام‌ها</Text>
              <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                صندوق پیام‌های شریک
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sm, fontWeight: '600' }}>
                {toFa(conversations.length)} گفتگو
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
          linkedPartner ? (
            <EmptyState
              icon={ACTION_ICONS.messages}
              title="هنوز پیامی نیست"
              description="اولین پیامت را بفرست."
              actionLabel="شروع گفتگو"
              onAction={() =>
                navigation.navigate('Conversation', {
                  partnerId: linkedPartner.id,
                  partnerName: resolvePartnerName(linkedPartner.id),
                })
              }
            />
          ) : (
            <EmptyState
              icon={ACTION_ICONS.messages}
              title="هنوز پیامی نیست"
              description="با یک شریک پیوند بخور تا گفتگو را شروع کنی."
            />
          )
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
