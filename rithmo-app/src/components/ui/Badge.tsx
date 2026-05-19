import React, { memo } from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { useTheme } from '@hooks/useTheme';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'accent';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  dot?: boolean;
}

export const Badge = memo(function Badge({ label, variant = 'primary', style, dot = false }: BadgeProps) {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const map: Record<BadgeVariant, { bg: string; text: string }> = {
    primary: { bg: colors.primaryLight,  text: colors.primary },
    success: { bg: colors.successBg,     text: colors.success },
    warning: { bg: colors.warningBg,     text: colors.warning },
    error:   { bg: colors.errorBg,       text: colors.error },
    info:    { bg: colors.infoBg,        text: colors.info },
    neutral: { bg: colors.surfaceSecondary, text: colors.textSecondary },
    accent:  { bg: colors.accentLight,   text: colors.accent },
  };

  const { bg, text } = map[variant];

  return (
    <View style={[{
      backgroundColor: bg,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing[3],
      paddingVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
    }, style]}>
      {dot && (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: text, marginRight: 5 }} />
      )}
      <Text style={{ color: text, fontSize: typography.xs, fontWeight: '700', letterSpacing: 0 }}>
        {label}
      </Text>
    </View>
  );
});
