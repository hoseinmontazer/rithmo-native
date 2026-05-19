import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import type { CyclePhase } from '@types/period.types';

interface CyclePhaseBannerProps {
  phase: CyclePhase;
  daysUntilNext: number;
  nextPeriodDate: string;
}

const PHASE_META: Record<CyclePhase, { label: string; emoji: string; description: string }> = {
  menstrual:  { label: 'Menstrual',  emoji: '●', description: 'Your period is here. Rest and take care.' },
  follicular: { label: 'Follicular', emoji: '🌱', description: 'Energy rising. Great time to start new things.' },
  ovulation:  { label: 'Ovulation',  emoji: '✨', description: 'Peak fertility window. You may feel your best.' },
  luteal:     { label: 'Luteal',     emoji: '🌙', description: 'Wind down. Self-care is key this week.' },
};

export const CyclePhaseBanner = memo(function CyclePhaseBanner({
  phase,
  daysUntilNext,
  nextPeriodDate,
}: CyclePhaseBannerProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const meta = PHASE_META[phase];
  const phaseColor = colors[phase];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: phaseColor + '18',
          borderColor: phaseColor + '44',
          borderRadius: borderRadius.xl,
          padding: spacing[5],
          borderWidth: 1,
        },
      ]}
    >
      <View style={styles.row}>
        <Text style={{ fontSize: 36 }}>{meta.emoji}</Text>
        <View style={[styles.textBlock, { marginLeft: spacing[3] }]}>
          <Text style={[styles.phaseLabel, { color: phaseColor, fontSize: typography.xl, fontWeight: '700' }]}>
            {meta.label} Phase
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary, fontSize: typography.sm, marginTop: 2 }]}>
            {meta.description}
          </Text>
        </View>
      </View>

      <View style={[styles.statsRow, { marginTop: spacing[4] }]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary, fontSize: typography['2xl'], fontWeight: '700' }]}>
            {daysUntilNext}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
            days until next period
          </Text>
        </View>
        <View style={[styles.stat, { alignItems: 'flex-end' }]}>
          <Text style={[styles.statValue, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600' }]}>
            {nextPeriodDate}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
            expected date
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {},
  row:       { flexDirection: 'row', alignItems: 'center' },
  textBlock: { flex: 1 },
  phaseLabel: {},
  description: { lineHeight: 18 },
  statsRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  stat:      {},
  statValue: {},
  statLabel: { marginTop: 2 },
});
