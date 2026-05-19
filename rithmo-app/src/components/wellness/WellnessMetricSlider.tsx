import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface WellnessMetricSliderProps {
  label: string;
  value: number;
  max?: number;
  emoji?: string;
  colorOverride?: string;
}

export const WellnessMetricSlider = memo(function WellnessMetricSlider({
  label,
  value,
  max = 10,
  emoji,
  colorOverride,
}: WellnessMetricSliderProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  const pct = Math.min(value / max, 1);
  const barColor = colorOverride ?? (pct > 0.7 ? colors.success : pct > 0.4 ? colors.warning : colors.error);

  return (
    <View style={[styles.container, { marginBottom: spacing[3] }]}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.textPrimary, fontSize: typography.sm, fontWeight: '500' }]}>
          {emoji ? `${emoji}  ` : ''}{label}
        </Text>
        <Text style={[styles.value, { color: colors.textSecondary, fontSize: typography.sm }]}>
          {value}/{max}
        </Text>
      </View>

      {/* Track */}
      <View
        style={[
          styles.track,
          {
            backgroundColor: colors.surfaceSecondary,
            borderRadius: borderRadius.full,
            height: 8,
            marginTop: spacing[1],
          },
        ]}
      >
        {/* Fill */}
        <View
          style={[
            styles.fill,
            {
              width: `${pct * 100}%`,
              backgroundColor: barColor,
              borderRadius: borderRadius.full,
              height: 8,
            },
          ]}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {},
  labelRow:  { flexDirection: 'row', justifyContent: 'space-between' },
  label:     {},
  value:     {},
  track:     { overflow: 'hidden' },
  fill:      {},
});
