import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Button } from './Button';
import { extractErrorMessage } from '@utils/errorHandler';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export const ErrorState = memo(function ErrorState({ error, onRetry, fullScreen = false }: ErrorStateProps) {
  const { colors, typography, spacing } = useTheme();
  const message = extractErrorMessage(error);

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen, { backgroundColor: colors.background }]}>
      <Text style={{ fontSize: 40 }}>⚠️</Text>
      <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.lg, marginTop: spacing[3] }]}>
        Something went wrong
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary, fontSize: typography.base, marginTop: spacing[2] }]}>
        {message}
      </Text>
      {onRetry && (
        <Button
          label="Try Again"
          onPress={onRetry}
          variant="outline"
          style={{ marginTop: spacing[5] }}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container:  { alignItems: 'center', justifyContent: 'center', padding: 32 },
  fullScreen: { flex: 1 },
  title:      { fontWeight: '600', textAlign: 'center' },
  message:    { textAlign: 'center', lineHeight: 22 },
});
