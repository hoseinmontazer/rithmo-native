/**
 * StepperInput — A +/– number stepper for bounded integer values.
 * Used for cycle preference fields (cycle length, period duration).
 */
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface StepperInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  hint?: string;
  error?: string;
  onChange: (value: number) => void;
}

export const StepperInput = memo(function StepperInput({
  label,
  value,
  min,
  max,
  unit = 'days',
  hint,
  error,
  onChange,
}: StepperInputProps) {
  const { colors, typography, borderRadius } = useTheme();

  const decrement = () => { if (value > min) { onChange(value - 1); } };
  const increment = () => { if (value < max) { onChange(value + 1); } };

  const canDec = value > min;
  const canInc = value < max;

  return (
    <View style={styles.wrapper}>
      {/* Label */}
      <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.sm }]}>
        {label}
      </Text>

      {/* Stepper row */}
      <View
        style={[
          styles.row,
          {
            borderColor: error ? colors.error : colors.border,
            borderRadius: borderRadius.xl,
            backgroundColor: colors.surface,
          },
        ]}
      >
        {/* Decrement */}
        <TouchableOpacity
          onPress={decrement}
          disabled={!canDec}
          accessibilityLabel={`Decrease ${label}`}
          style={[
            styles.btn,
            {
              backgroundColor: canDec ? colors.primaryLighter : colors.surfaceSecondary,
              borderRadius: borderRadius.xl,
            },
          ]}
        >
          <Text
            style={{
              color: canDec ? colors.primary : colors.textDisabled,
              fontSize: typography.xlarge,
              fontWeight: '700',
              lineHeight: 26,
            }}
          >
            −
          </Text>
        </TouchableOpacity>

        {/* Value display */}
        <View style={styles.valueBox}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography['2xl'],
              fontWeight: '800',
              letterSpacing: -0.5,
            }}
          >
            {value}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.xs,
              fontWeight: '600',
              marginTop: 1,
            }}
          >
            {unit}
          </Text>
        </View>

        {/* Increment */}
        <TouchableOpacity
          onPress={increment}
          disabled={!canInc}
          accessibilityLabel={`Increase ${label}`}
          style={[
            styles.btn,
            {
              backgroundColor: canInc ? colors.primaryLighter : colors.surfaceSecondary,
              borderRadius: borderRadius.xl,
            },
          ]}
        >
          <Text
            style={{
              color: canInc ? colors.primary : colors.textDisabled,
              fontSize: typography.xlarge,
              fontWeight: '700',
              lineHeight: 26,
            }}
          >
            +
          </Text>
        </TouchableOpacity>
      </View>

      {/* Range hint */}
      {hint && !error && (
        <Text style={[styles.hint, { color: colors.textTertiary, fontSize: typography.xs }]}>
          {hint}
        </Text>
      )}

      {/* Error */}
      {error && (
        <Text style={[styles.hint, { color: colors.error, fontSize: typography.xs }]}>
          {error}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  label: { fontWeight: '700', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  btn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { marginTop: 5 },
});
