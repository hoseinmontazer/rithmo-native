/**
 * PhasePill — cycle phase chip with semantic color coding.
 *
 * Persian labels (mission: no English headers, consistent terminology —
 * چرخه/دوره), supports the full CyclePhase union (including expected /
 * late / overdue / unknown), fa numerals.
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { toFa } from '@utils/persian';
import type { CyclePhase } from '@types/period.types';

interface PhasePillProps {
  phase: CyclePhase;
  day?: number;
  style?: ViewStyle;
}

type AccentKey = 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'info' | 'warning' | 'primary';

const PHASE_META: Record<CyclePhase, { label: string; accent: AccentKey }> = {
  menstrual: { label: 'روزهای دوره', accent: 'menstrual' },
  follicular: { label: 'فولیکولار', accent: 'follicular' },
  ovulation: { label: 'تخمک‌گذاری', accent: 'ovulation' },
  luteal:    { label: 'لوتئال', accent: 'luteal' },
  expected:  { label: 'پیش‌بینی دوره', accent: 'info' },
  late:      { label: 'شروع با تأخیر', accent: 'warning' },
  overdue:   { label: 'دیرتر از پیش‌بینی', accent: 'warning' },
  unknown:   { label: 'چرخه', accent: 'primary' },
};

export const PhasePill = memo(function PhasePill({ phase, day, style }: PhasePillProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();

  const meta = PHASE_META[phase] ?? PHASE_META.unknown;
  const phaseColor   = (colors as unknown as Record<string, string>)[meta.accent] ?? colors.primary;
  const phaseBg      = (colors as unknown as Record<string, string>)[`${meta.accent}Bg`] ?? phaseColor + '1A';
  const phaseBorder  = (colors as unknown as Record<string, string>)[`${meta.accent}Border`] ?? phaseColor + '4D';

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: phaseBg,
          borderRadius: borderRadius.full,
          paddingVertical: 4,
          paddingHorizontal: spacing[3],
          borderWidth: 1,
          borderColor: phaseBorder,
        },
        style,
      ]}
      accessibilityLabel={`مرحله‌ی ${meta.label}${day ? `، روز ${toFa(day)}` : ''}`}
    >
      <View style={[styles.dot, { backgroundColor: phaseColor }]} />
      <Text
        style={[
          styles.text,
          {
            color: phaseColor,
            fontSize: typography.caption,
            fontWeight: '600',
            marginHorizontal: spacing[2],
          },
        ]}
      >
        {meta.label}
        {day !== undefined && ` · روز ${toFa(day)}`}
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
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {},
});
