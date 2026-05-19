import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface GradientBackgroundProps {
  children?: React.ReactNode;
  colors?: string[];
  style?: ViewStyle;
  variant?: 'rose' | 'violet' | 'teal' | 'amber';
}

const GRADIENT_PRESETS = {
  rose: ['#fff1f2', '#ffffff'],
  violet: ['#faf5ff', '#ffffff'],
  teal: ['#f0fdfa', '#ffffff'],
  amber: ['#fffbeb', '#ffffff'],
};

export const GradientBackground = memo(function GradientBackground({
  children,
  colors,
  style,
  variant = 'rose',
}: GradientBackgroundProps) {
  const gradientColors = colors || GRADIENT_PRESETS[variant];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: gradientColors[0] },
        style,
      ]}
    >
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
