/**
 * FAB — Floating Action Button
 */
import React, { memo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Icon } from './Icon';

interface FABProps {
  onPress: () => void;
  iconName?: string;
  emoji?: string;
  size?: number;
  style?: ViewStyle;
}

export const FAB = memo(function FAB({
  onPress,
  iconName = 'add',
  emoji,
  size = 56,
  style,
}: FABProps) {
  const { colors, shadow } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add"
      style={[
        styles.fab,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary,
          ...shadow.brand,
        },
        style,
      ]}
    >
      {emoji ? (
        <Text style={{ fontSize: size * 0.4 }}>{emoji}</Text>
      ) : (
        <Icon name={iconName} size={size * 0.45} color={colors.textOnPrimary} fallback="+" />
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
