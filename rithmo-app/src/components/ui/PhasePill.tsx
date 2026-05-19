/**
 * PhasePill — Displays current cycle phase with color coding
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface PhasePillProps {
  phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal';
  day?: number;
  style?: ViewStyle;
}

const PHASE_LABELS = {
  menstrual: 'Menstrual Phase',
  follicular: 'Follicular Phase',
  ovulation: 'Ovulation',
  luteal: 'Luteal Phase',
};

export const PhasePill = memo(function PhasePill({
  phase,
  day,
  style,
}: PhasePillProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();

  const phaseColors = {
    menstrual: colors.menstrual,
    follicular: colors.follicular,
    ovulation: colors.ovulation,
    luteal: colors.luteal,
  };

  const phaseBgColors = {
    menstrual: colors.menstrualBg,
    follicular: colors.follicularBg,
    ovulation: colors.ovulationBg,
    luteal: colors.lutealBg,
  };

  const phaseColor = phaseColors[phase];
  const phaseBg = phaseBgColors[phase];

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: phaseBg,
          borderRadius: borderRadius.full,
          paddingVertical: spacing[2],
          paddingHorizontal: spacing[4],
          borderWidth: 1,
          borderColor: phaseColor + '40',
        },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: phaseColor }]} />
      <Text
        style={[
          styles.text,
          {
            color: phaseColor,
            fontSize: typography.sm,
            fontWeight: '600',
            marginLeft: spacing[2],
          },
        ]}
      >
        {PHASE_LABELS[phase]}
        {day !== undefined && ` · Day ${day}`}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {},
});
