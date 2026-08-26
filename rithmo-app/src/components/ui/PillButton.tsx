import React, { memo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface PillButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const PillButton = memo(function PillButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: PillButtonProps) {
  const { colors, spacing, typography, borderRadius, shadow } = useTheme();

  const sizeStyles = {
    sm: { paddingVertical: spacing[2], paddingHorizontal: spacing[4], fontSize: typography.sm },
    md: { paddingVertical: spacing[3], paddingHorizontal: spacing[5], fontSize: typography.base },
    lg: { paddingVertical: spacing[4], paddingHorizontal: spacing[6], fontSize: typography.lg },
  };

  const variantStyles = {
    primary: {
      backgroundColor: colors.primary,
      borderWidth: 0,
      ...shadow.soft,
    },
    secondary: {
      backgroundColor: colors.accent,
      borderWidth: 0,
      ...shadow.soft,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
  };

  const textColors = {
    primary: colors.textOnPrimary,
    secondary: colors.textOnPrimary,
    outline: colors.primary,
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];
  const textColor = textColors[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={[
        styles.button,
        currentVariant,
        {
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
          borderRadius: borderRadius.pill,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              {
                color: textColor,
                fontSize: currentSize.fontSize,
                fontWeight: '600',
                marginLeft: icon ? spacing[2] : 0,
              },
              textStyle,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
});
