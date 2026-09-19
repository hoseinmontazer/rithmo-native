import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Button } from './Button';
import { Icon } from './Icon';
import { extractErrorMessage, isRateLimitedError } from '@utils/errorHandler';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export const ErrorState = memo(function ErrorState({ error, onRetry, fullScreen = false }: ErrorStateProps) {
  const { colors, typography, spacing } = useTheme();
  const message = extractErrorMessage(error);
  // A 429 is not a failure — the user did nothing wrong, they just need
  // to wait — so it gets its own calmer framing (clock icon, no "مشکلی
  // پیش آمد") rather than the generic error treatment below.
  const rateLimited = isRateLimitedError(error);

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen, { backgroundColor: colors.background }]}>
      <View style={[styles.iconContainer, { backgroundColor: rateLimited ? colors.surfaceSecondary : colors.errorBg }]}>
        <Icon
          name={rateLimited ? 'clock-outline' : 'alert-circle-outline'}
          size={28}
          color={rateLimited ? colors.textSecondary : colors.error}
        />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.title, marginTop: spacing[3] }]}>
        {rateLimited ? 'کمی صبر کن' : 'مشکلی پیش آمد'}
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary, fontSize: typography.bodySmall, marginTop: spacing[2] }]}>
        {message}
      </Text>
      {onRetry && (
        <Button
          label="تلاش دوباره"
          onPress={onRetry}
          variant="secondary"
          size="sm"
          style={{ marginTop: spacing[4] }}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container:     { alignItems: 'center', justifyContent: 'center', padding: 32 },
  fullScreen:    { flex: 1 },
  iconContainer: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title:         { fontWeight: '700', textAlign: 'center' },
  message:       { textAlign: 'center', lineHeight: 20, maxWidth: 280 },
});

