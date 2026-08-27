/**
 * SliderMetric — a touch-drag slider with a live value badge and a quick
 * +/- stepper, for the one field on a log form that reads better as a
 * continuous scale than a set of discrete options (e.g. energy).
 *
 * Extracted from LogWellnessScreen (previously a private, unexported
 * component there) so QuickLogScreen can use the exact same control rather
 * than a second hand-rolled slider — the touch-tracking, stepper and
 * accessibility behavior stay in one place.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { toFa } from '@utils/persian';

interface SliderMetricProps {
  icon: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  iconColor: string;
  unit?: string;
  step?: number;
}

export function SliderMetric({
  icon,
  label,
  value,
  min,
  max,
  onChange,
  iconColor,
  unit,
  step = 1,
}: SliderMetricProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const handleTouch = (event: any) => {
    if (trackWidth === 0) { return; }
    const locationX = event.nativeEvent.locationX;
    let percentage = Math.max(0, Math.min(1, locationX / trackWidth));
    // `locationX` is always a physical (left-to-right) touch offset — it is
    // never mirrored under RTL. The thumb/fill below render with `left`,
    // which on this device DOES visually mirror under I18nManager.isRTL
    // (confirmed on-device: dragging the physical-left edge moved a thumb
    // rendered at the physical-right, and vice versa). Without this flip,
    // touch position and the thumb you see fighting each other on every
    // drag — the exact opposite side reacts to your finger.
    if (I18nManager.isRTL) { percentage = 1 - percentage; }
    const rawValue = min + percentage * (max - min);
    const newValue = Math.round(rawValue / step) * step;
    onChange(Math.max(min, Math.min(max, newValue)));
  };

  const handleDecrement = () => onChange(Math.max(min, value - step));
  const handleIncrement = () => onChange(Math.min(max, value + step));

  const percentage = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <View style={{ marginBottom: spacing[4] }}>
      <View style={styles.metricHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={[styles.metricIconWrap, { backgroundColor: iconColor + '18', borderRadius: borderRadius.sm }]}>
            <Icon name={icon} size={18} color={iconColor} />
          </View>
          <Text style={[styles.metricLabelText, { color: colors.textPrimary, fontSize: typography.sm, marginLeft: spacing[2] }]}>
            {label}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            onPress={handleDecrement}
            disabled={value <= min}
            style={[
              styles.stepBtn,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                borderRadius: borderRadius.sm,
                opacity: value <= min ? 0.3 : 1,
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`کاهش ${label}`}
          >
            <Icon name="minus" size={14} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.metricValueBadge, { backgroundColor: iconColor + '18', borderRadius: borderRadius.md }]}>
            <Text style={[styles.metricValueText, { color: iconColor, fontSize: typography.sm }]}>
              {toFa(value)}{unit ? ` ${unit}` : ''}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleIncrement}
            disabled={value >= max}
            style={[
              styles.stepBtn,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                borderRadius: borderRadius.sm,
                opacity: value >= max ? 0.3 : 1,
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`افزایش ${label}`}
          >
            <Icon name="plus" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[styles.sliderTrack, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.pill }]}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <View
          style={[
            styles.sliderFill,
            {
              width: `${percentage}%`,
              backgroundColor: iconColor,
              borderRadius: borderRadius.pill,
            },
          ]}
        />
        <View
          style={[
            styles.sliderThumb,
            {
              left: `${percentage}%`,
              backgroundColor: iconColor,
              borderRadius: borderRadius.pill,
              borderColor: colors.surface,
            },
          ]}
        />
      </View>

      <View style={styles.rangeLabelsRow}>
        <Text style={[styles.rangeLabelText, { color: colors.textTertiary, fontSize: typography.xs }]}>
          {toFa(min)}
        </Text>
        <Text style={[styles.rangeLabelText, { color: colors.textTertiary, fontSize: typography.xs }]}>
          {toFa(max)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metricHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabelText: {
    fontWeight: '600',
  },
  metricValueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 44,
    alignItems: 'center',
  },
  metricValueText: {
    fontWeight: '700',
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 6,
    width: '100%',
    position: 'relative',
    marginVertical: 6,
  },
  sliderFill: {
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sliderThumb: {
    width: 18,
    height: 18,
    position: 'absolute',
    top: -6,
    borderWidth: 2,
    marginLeft: -9,
  },
  rangeLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabelText: {
    fontWeight: '500',
  },
});
