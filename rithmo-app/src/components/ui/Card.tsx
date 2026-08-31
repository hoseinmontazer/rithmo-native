import React, { memo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface CardProps {
  children: React.ReactNode;
  // `StyleProp` rather than a bare `ViewStyle`: five call sites across the
  // insights screens pass style ARRAYS, which a bare ViewStyle rejects.
  style?: StyleProp<ViewStyle>;
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
  rounded = 'lg',
}: CardProps) {
  const { colors, spacing, borderRadius, shadow } = useTheme();

  const radiusMap = {
    md: borderRadius.md,
    lg: borderRadius.lg,
    xl: borderRadius.xl,
    '2xl': borderRadius['2xl'],
  };

  const radius = radiusMap[rounded] ?? borderRadius.lg;

  if (gradientBorder) {
    return (
      <View
        style={[
          styles.gradientWrapper,
          {
            borderRadius: radius,
            padding: 1.5,
            backgroundColor: colors.accent,
            ...(elevated ? shadow.sm : shadow.none),
          },
          style,
        ]}
      >
        <View
          style={[
            styles.gradientInner,
            {
              backgroundColor: colors.surface,
              borderRadius: radius - 1.5,
              padding: noPadding ? 0 : spacing[4],
            },
          ]}
        >
          {children}
        </View>
      </View>
    );
  }

  if (accentColor) {
    return (
      <View
        style={[
          styles.accentOuter,
          {
            backgroundColor: colors.surface,
            borderRadius: radius,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
            ...(elevated ? shadow.sm : shadow.none),
          },
          style,
        ]}
      >
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
        <View style={{ flex: 1, padding: noPadding ? 0 : spacing[4] }}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: colors.border,
          padding: noPadding ? 0 : spacing[4],
          overflow: 'hidden',
          ...(elevated ? shadow.sm : shadow.none),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  accentOuter: { flexDirection: 'row' },
  accent: { width: 4 },
  gradientWrapper: { overflow: 'hidden' },
  gradientInner: { flex: 1 },
});

