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
          backgroundColor: chipColor + '15',
          borderRadius: borderRadius.full,
          paddingVertical: spacing[3],
          paddingHorizontal: spacing[5],
          borderWidth: 1,
          borderColor: chipColor + '30',
          ...shadow.xs,
        },
        style,
      ]}
    >
      {emoji && <Text style={[styles.emoji, { marginRight: spacing[2] }]}>{emoji}</Text>}
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
            fontSize: typography.sm,
            fontWeight: '600',
            marginLeft: (emoji || iconName) ? spacing[2] : 0,
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
    fontSize: 18,
  },
  label: {},
});
