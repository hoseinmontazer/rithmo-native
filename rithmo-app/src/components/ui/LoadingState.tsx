import React, { memo } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingState = memo(function LoadingState({
  message = 'Loading…',
  fullScreen = false,
}: LoadingStateProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={[styles.text, { color: colors.textSecondary, fontSize: typography.bodySmall, marginTop: spacing[3] }]}>
        {message}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container:  { alignItems: 'center', justifyContent: 'center', padding: 32 },
  fullScreen: { flex: 1 },
  text:       { textAlign: 'center', fontWeight: '500' },
});

