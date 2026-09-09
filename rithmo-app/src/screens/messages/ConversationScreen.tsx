import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, I18nManager,
  RefreshControl,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { useConversation, useSendMessage } from '@hooks/queries/useNotifications';
import { useAuth } from '@hooks/useAuth';
import { LoadingState, ErrorState } from '@components/ui';
import { MessageBubble } from '@components/messages/MessageBubble';
import { extractErrorMessage } from '@utils/errorHandler';
import type { Message } from '@types/notification.types';
import type { MessagesScreenProps } from '@navigation/types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ACTION_ICONS, ICON_SIZE, shouldFlipForRTL } from '@design-system/iconography';

type Props = MessagesScreenProps<'Conversation'>;

export default function ConversationScreen() {
  const route = useRoute<Props['route']>();
  const { colors, spacing, borderRadius } = useTheme();
  const { userId } = useAuth();
  const { partnerId } = route.params;

  const { data: messages, isLoading, isError, error, refetch } = useConversation(partnerId);
  const { mutateAsync: sendMessage, isPending: sending } = useSendMessage();

  const [text, setText] = useState('');
  /**
   * Pull-to-refresh.
   *
   * `refetch` was destructured but only reachable from the error state, so on a
   * successful-but-stale thread the user had no way to ask for new messages.
   * The 10s `refetchInterval` does not cover it: React Query pauses polling
   * while the app is backgrounded, and this client sets
   * `refetchOnWindowFocus: false` globally, so returning to a conversation did
   * not refetch either — the thread could sit stale indefinitely.
   */
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);
  const listRef = useRef<FlatList>(null);
  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  // Rendered as an INVERTED list (below): index 0 is the newest message and
  // sits at the visual bottom, so opening the conversation is already
  // "scrolled to the bottom" for free, with no manual scrollToEnd().
  //
  // The previous version rendered oldest-first and faked bottom-anchoring by
  // calling scrollToEnd() from onContentSizeChange on every data change —
  // including from the 10s background poll (useConversation). Combined with
  // that scroll forcing FlatList to keep mounting cells all the way to the
  // true end, a long thread (~60 messages here) had nearly its entire
  // history mounted at once, and a poll-triggered re-render landing while
  // the screen was mid-unmount (back navigation) crashed Fabric with
  // "Cannot remove child at index N ... IndexOutOfBoundsException", leaving
  // the app on a blank white screen until force-restarted. Inverting removes
  // the scroll-forced full mount and the imperative scroll call that raced
  // with unmount in the first place, rather than just guarding it.
  const invertedMessages = useMemo(() => [...(messages ?? [])].reverse(), [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) {return;}
    setText('');
    try {
      await sendMessage({ receiver: partnerId, message: trimmed });
      // "Scroll to bottom" on an inverted list is offset 0.
      setTimeout(() => {
        if (isMountedRef.current) {listRef.current?.scrollToOffset({ offset: 0, animated: true });}
      }, 100);
    } catch (err) {
      Alert.alert('خطا', extractErrorMessage(err));
      setText(trimmed); // restore on failure
    }
  }, [text, sending, sendMessage, partnerId]);

  const renderItem = useCallback(({ item }: { item: Message }) => (
    // String-compared: `sender` is a DRF integer pk and `userId` a string, so
    // this was always false and EVERY message rendered as the partner's.
    <MessageBubble message={item} isMine={String(item.sender) === String(userId)} />
  ), [userId]);

  const keyExtractor = useCallback((item: Message) => String(item.id), []);

  if (isLoading) {return <LoadingState fullScreen message="در حال بارگذاری گفتگو…" />;}
  if (isError)   {return <ErrorState fullScreen error={error} onRetry={refetch} />;}

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      // Android: NO behavior, deliberately.
      //
      // AndroidManifest already declares `android:windowSoftInputMode=
      // "adjustResize"`, so the OS shrinks the window itself when the keyboard
      // opens. Adding `behavior="height"` on top of that compensates a SECOND
      // time — the window shrinks and then KeyboardAvoidingView shrinks its
      // child again — which pushed the composer and its send button below the
      // visible area. The user had to dismiss the keyboard to reach send.
      //
      // With `behavior` undefined the component renders as a plain View and
      // lets adjustResize do the work, which is the documented pairing.
      // `keyboardVerticalOffset` is iOS-only for the same reason.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={listRef}
        data={invertedMessages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingVertical: spacing[3] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        // NOT removeClippedSubviews — on Android this is a long-documented
        // source of "Cannot remove child at index N ... IndexOutOfBoundsException"
        // crashes in Fabric/new-architecture apps.
        maxToRenderPerBatch={20}
        windowSize={10}
        initialNumToRender={20}
        inverted
      />

      {/* Input bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surfaceSecondary,
              borderRadius: borderRadius.pill,
              color: colors.textPrimary,
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[2],
              flex: 1,
              maxHeight: 100,
            },
          ]}
          placeholder="پیام بنویس…"
          placeholderTextColor={colors.textDisabled}
          value={text}
          onChangeText={setText}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
          accessibilityLabel="ورودی پیام"
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim() || sending}
          accessibilityLabel="ارسال پیام"
          style={[
            styles.sendBtn,
            {
              backgroundColor: text.trim() ? colors.primary : colors.surfaceSecondary,
              borderRadius: borderRadius.pill,
              width: 44,
              height: 44,
              marginLeft: spacing[3],
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          {/* Mirrored under RTL: a send arrow points the way the message
              travels, which is leftwards in a right-to-left conversation. */}
          <Icon
            name={ACTION_ICONS.send}
            size={ICON_SIZE.sm}
            color={text.trim() ? colors.textOnPrimary : colors.textSecondary}
            style={
              shouldFlipForRTL(ACTION_ICONS.send) && I18nManager.isRTL
                ? { transform: [{ scaleX: -1 }] }
                : undefined
            }
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:     { flex: 1 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: 1 },
  input:    {},
  sendBtn:  {},
});
