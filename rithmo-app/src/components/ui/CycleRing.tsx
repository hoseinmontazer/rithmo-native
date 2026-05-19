/**
 * CycleRing — Circular progress ring showing cycle day and phase
 * The visual centerpiece of the home screen
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface CycleRingProps {
  currentDay: number;
  totalDays: number;
  phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal';
  size?: number;
}

export const CycleRing = memo(function CycleRing({
  currentDay,
  totalDays,
  phase,
  size = 200,
}: CycleRingProps) {
  const { colors, typography } = useTheme();

  const phaseColors = {
    menstrual: colors.menstrual,
    follicular: colors.follicular,
    ovulation: colors.ovulation,
    luteal: colors.luteal,
  };

  const phaseColor = phaseColors[phase];
  const progress = currentDay / totalDays;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background ring */}
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: colors.border,
          },
        ]}
      />
      
      {/* Progress ring - simplified for React Native without SVG */}
      <View
        style={[
          styles.progressRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: phaseColor,
            borderTopColor: 'transparent',
            borderRightColor: progress > 0.25 ? phaseColor : 'transparent',
            borderBottomColor: progress > 0.5 ? phaseColor : 'transparent',
            borderLeftColor: progress > 0.75 ? phaseColor : 'transparent',
            transform: [{ rotate: '-90deg' }],
          },
        ]}
      />

      {/* Center content */}
      <View style={styles.center}>
        <Text
          style={[
            styles.dayNumber,
            {
              color: colors.textPrimary,
              fontSize: typography['4xl'] || 48,
              fontWeight: '700',
            },
          ]}
        >
          {currentDay}
        </Text>
        <Text
          style={[
            styles.dayLabel,
            {
              color: colors.textSecondary,
              fontSize: typography.sm,
              marginTop: 4,
            },
          ]}
        >
          of {totalDays} days
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
  },
  progressRing: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    lineHeight: 56,
  },
  dayLabel: {},
});
