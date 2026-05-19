import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = memo(function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {icon ? <Text style={{ fontSize: 48 }}>{icon}</Text> : null}
      <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.lg, marginTop: spacing[3] }]}>
        {title}
      </Text>
      {description && (
        <Text style={[styles.desc, { color: colors.textSecondary, fontSize: typography.base, marginTop: spacing[2] }]}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="primary"
          style={{ marginTop: spacing[5] }}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  title:     { fontWeight: '600', textAlign: 'center' },
  desc:      { textAlign: 'center', lineHeight: 22 },
});
