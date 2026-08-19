import React, { memo } from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { useTheme } from '@hooks/useTheme';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'accent' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  dot?: boolean;
}

export const Badge = memo(function Badge({ label, variant = 'primary', style, dot = false }: BadgeProps) {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const map: Record<BadgeVariant, { bg: string; text: string }> = {
    primary: { bg: colors.surfaceSubtle,     text: colors.textPrimary },
    success: { bg: colors.successBg,        text: colors.success },
    warning: { bg: colors.warningBg,        text: colors.warning },
    error:   { bg: colors.errorBg,          text: colors.error },
    info:    { bg: colors.infoBg,           text: colors.info },
    neutral: { bg: colors.surfaceSubtle,    text: colors.textSecondary },
    default: { bg: colors.surfaceSubtle,    text: colors.textSecondary },
    accent:  { bg: colors.accentLight,      text: colors.accent },
  };

  const { bg, text } = map[variant];

  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: borderRadius.small,
          paddingHorizontal: spacing[2],
          paddingVertical: 3,
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      {dot && (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: text,
            marginHorizontal: 4,
          }}
        />
      )}
      <Text
        style={{
          color: text,
          fontSize: typography.label,
          fontWeight: '600',
          letterSpacing: 0,
        }}
      >
        {label}
      </Text>
    </View>
  );
});

