import React, { useState, useCallback, useRef } from 'react';
import {
  View, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Text, Alert,
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

type Props = MessagesScreenProps<'Conversation'>;

export default function ConversationScreen() {
  const route = useRoute<Props['route']>();
  const { colors, spacing, borderRadius } = useTheme();
  const { userId } = useAuth();
  const { partnerId } = route.params;

  const { data: messages, isLoading, isError, error, refetch } = useConversation(partnerId);
  const { mutateAsync: sendMessage, isPending: sending } = useSendMessage();

  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) {return;}
    setText('');
    try {
      await sendMessage({ receiver: partnerId, message: trimmed });
      // Scroll to bottom after send
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
      setText(trimmed); // restore on failure
    }
  }, [text, sending, sendMessage, partnerId]);

  const renderItem = useCallback(({ item }: { item: Message }) => (
    <MessageBubble message={item} isMine={item.sender === userId} />
  ), [userId]);

  const keyExtractor = useCallback((item: Message) => String(item.id), []);

  if (isLoading) {return <LoadingState fullScreen message="Loading conversation…" />;}
  if (isError)   {return <ErrorState fullScreen error={error} onRetry={refetch} />;}

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={listRef}
        data={messages ?? []}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingVertical: spacing[3] }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        removeClippedSubviews
        maxToRenderPerBatch={20}
        windowSize={10}
        initialNumToRender={20}
        inverted={false}
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
              borderRadius: borderRadius.full,
              color: colors.textPrimary,
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[2],
              flex: 1,
              maxHeight: 100,
            },
          ]}
          placeholder="Type a message…"
          placeholderTextColor={colors.textDisabled}
          value={text}
          onChangeText={setText}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
          accessibilityLabel="Message input"
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim() || sending}
          accessibilityLabel="Send message"
          style={[
            styles.sendBtn,
            {
              backgroundColor: text.trim() ? colors.primary : colors.surfaceSecondary,
              borderRadius: borderRadius.full,
              width: 44,
              height: 44,
              marginLeft: spacing[3],
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <Text style={{ fontSize: 18 }}>➤</Text>
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
