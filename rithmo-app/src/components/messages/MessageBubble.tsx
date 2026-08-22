import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import type { Message } from '@types/notification.types';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
}

export const MessageBubble = memo(function MessageBubble({ message, isMine }: MessageBubbleProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  const time = new Date(message.created_at).toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.wrapper, isMine ? styles.wrapperRight : styles.wrapperLeft]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isMine ? colors.primary : colors.surface,
            borderRadius: borderRadius.xl,
            borderBottomRightRadius: isMine ? borderRadius.sm : borderRadius.xl,
            borderBottomLeftRadius:  isMine ? borderRadius.xl : borderRadius.sm,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            maxWidth: '78%',
            borderWidth: isMine ? 0 : 1,
            borderColor: colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.text,
            {
              color: isMine ? colors.textOnPrimary : colors.textPrimary,
              fontSize: typography.base,
              lineHeight: 22,
            },
          ]}
        >
          {message.message}
        </Text>
        <Text
          style={[
            styles.time,
            {
              color: isMine ? colors.textOnPrimary + 'aa' : colors.textDisabled,
              fontSize: typography.xs,
              marginTop: spacing[1],
              textAlign: isMine ? 'right' : 'left',
            },
          ]}
        >
          {time}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper:      { marginVertical: 4, paddingHorizontal: 12 },
  wrapperLeft:  { alignItems: 'flex-start' },
  wrapperRight: { alignItems: 'flex-end' },
  bubble:       {},
  text:         {},
  time:         {},
});
