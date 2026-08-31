import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Button } from './Button';
import { Icon } from './Icon';

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
      {icon ? (
        <View style={[styles.iconContainer, { backgroundColor: colors.surfaceSubtle }]}>
          {icon.length > 2 ? (
            <Icon name={icon} size={28} color={colors.textSecondary} fallback="●" />
          ) : (
            <Text style={{ fontSize: typography.heading }}>{icon}</Text>
          )}
        </View>
      ) : null}
      <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.title, marginTop: spacing[3] }]}>
        {title}
      </Text>
      {description && (
        <Text style={[styles.desc, { color: colors.textSecondary, fontSize: typography.bodySmall, marginTop: spacing[2] }]}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="primary"
          size="sm"
          style={{ marginTop: spacing[4] }}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container:     { alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconContainer: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title:         { fontWeight: '700', textAlign: 'center' },
  desc:          { textAlign: 'center', lineHeight: 20, maxWidth: 280 },
});

