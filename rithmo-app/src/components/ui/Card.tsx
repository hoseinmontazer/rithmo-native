import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  noPadding?: boolean;
  /** Optional left-side colored accent bar */
  accentColor?: string;
  /** Gradient border effect (for AI cards) */
  gradientBorder?: boolean;
  /** Soft rounded corners */
  rounded?: 'md' | 'lg' | 'xl' | '2xl';
}

export const Card = memo(function Card({
  children,
  style,
  elevated = false,
  noPadding = false,
  accentColor,
  gradientBorder = false,
  rounded = 'xl',
}: CardProps) {
  const { colors, spacing, borderRadius, shadow } = useTheme();

  const radiusMap = {
    md: borderRadius.md,
    lg: borderRadius.lg,
    xl: borderRadius.xl,
    '2xl': borderRadius['2xl'],
  };

  if (gradientBorder) {
    return (
      <View
        style={[
          styles.gradientWrapper,
          {
            borderRadius: radiusMap[rounded],
            padding: 2,
            backgroundColor: colors.accent,
            ...(elevated ? shadow.md : shadow.xs),
          },
          style,
        ]}
      >
        <View
          style={[
            styles.gradientInner,
            {
              backgroundColor: colors.surface,
              borderRadius: radiusMap[rounded] - 2,
              padding: noPadding ? 0 : spacing[5],
            },
          ]}
        >
          {children}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.outer,
        {
          backgroundColor: colors.surface,
          borderRadius: radiusMap[rounded],
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          ...(elevated ? shadow.md : shadow.xs),
        },
        style,
      ]}
    >
      {accentColor && (
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
      )}
      <View
        style={[
          { flex: 1, padding: noPadding ? 0 : spacing[5] },
          accentColor ? { marginLeft: 0 } : undefined,
        ]}
      >
        {children}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outer: { flexDirection: 'row' },
  accent: { width: 4 },
  gradientWrapper: { overflow: 'hidden' },
  gradientInner: { flex: 1 },
});
