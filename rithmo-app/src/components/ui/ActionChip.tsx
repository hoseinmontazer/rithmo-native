/**
 * ActionChip — Pill-shaped action button for horizontal scrolling
 */
import React, { memo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Icon } from './Icon';

interface ActionChipProps {
  label: string;
  onPress: () => void;
  iconName?: string;
  emoji?: string;
  color?: string;
  style?: ViewStyle;
}

export const ActionChip = memo(function ActionChip({
  label,
  onPress,
  iconName,
  emoji,
  color,
  style,
}: ActionChipProps) {
  const { colors, spacing, typography, borderRadius, shadow } = useTheme();

  const chipColor = color || colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.chip,
        {
          backgroundColor: color ? color + '12' : colors.surfaceSubtle,
          borderRadius: borderRadius.pill,
          paddingVertical: spacing[2],
          paddingHorizontal: spacing[4],
          minHeight: 38,
          borderWidth: 1,
          borderColor: color ? color + '25' : colors.borderSubtle,
          ...shadow.xs,
        },
        style,
      ]}
    >
      {emoji && <Text style={[styles.emoji, { marginHorizontal: 4 }]}>{emoji}</Text>}
      {iconName && (
        <Icon
          name={iconName}
          size={18}
          color={chipColor}
          fallback="●"
        />
      )}
      <Text
        style={[
          styles.label,
          {
            color: colors.textPrimary,
            fontSize: typography.bodySmall,
            fontWeight: '600',
            marginHorizontal: (emoji || iconName) ? 4 : 0,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 16,
  },
  label: {},
});

