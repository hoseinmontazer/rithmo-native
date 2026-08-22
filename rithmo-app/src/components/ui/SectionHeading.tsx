/**
 * SectionHeading — consistent section label with optional action.
 * Every screen section (Home, Insights, History, …) uses this so the
 * hierarchy reads the same everywhere.
 */
import React, { memo } from 'react';
import { Text, TouchableOpacity, View, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface SectionHeadingProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const SectionHeading = memo(function SectionHeading({
  title,
  actionLabel,
  onAction,
  style,
}: SectionHeadingProps) {
  const { colors, typography } = useTheme();

  return (
    <View style={[styles.row, style]}>
      <Text
        style={[styles.title, { color: colors.textPrimary, fontSize: typography.title, fontWeight: '700' }]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={{ color: colors.primary, fontSize: typography.caption, fontWeight: '600' }}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  title: { flexShrink: 1 },
});
